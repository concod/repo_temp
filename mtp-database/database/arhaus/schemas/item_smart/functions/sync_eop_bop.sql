--liquibase formatted sql
--changeset rishabh.swarnkar@impactanalytics.co:sync_eop_bop runOnChange:true stripComments:false splitStatements:false context:MTP-66953 labels:item_smart_initial_commit
--comment: initial changeset for sync_eop_bop
--rollback: SELECT 1

DROP FUNCTION IF EXISTS item_smart.sync_eop_bop(sdate date, filters jsonb, dept text, planing_level text);
CREATE OR REPLACE FUNCTION item_smart.sync_eop_bop(sdate date, filters jsonb, dept text, planing_level text)
 RETURNS integer
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_sql            text;
  wp_table_name    text;
  v_affected_rows  integer;
  where_clause     text := ''; -- Initialize the WHERE clause
  filter           jsonb;
  attribute_name   text;
  values            text;
  operator         text;
  is_special_order_condition text;

BEGIN
  wp_table_name := 'item_smart.wp_master_' || dept;

  -- Build the WHERE clause dynamically from the filters
    FOR filter IN
    SELECT * FROM jsonb_array_elements(filters)
LOOP
    attribute_name := filter->>'attribute_name';
    values := (SELECT string_agg(quote_literal(value), ', ')
               FROM jsonb_array_elements_text(filter->'value') value);
    operator := filter->>'operator';
    
    -- Check if attribute_name is 'l3_name' and if any values have 'REGULAR_' or 'SPO_' prefixes
    IF planing_level = 'spo' AND attribute_name = 'l3_name' THEN
        IF values LIKE '%REGULAR_%' THEN
            is_special_order_condition := 'is_special_order = false';
            values := (SELECT string_agg(quote_literal(regexp_replace(value, '^REGULAR_', '')), ', ')
                       FROM jsonb_array_elements_text(filter->'value') value);
        ELSIF values LIKE '%SPO_%' THEN
            is_special_order_condition := 'is_special_order = true';
            values := (SELECT string_agg(quote_literal(regexp_replace(value, '^SPO_', '')), ', ')
                       FROM jsonb_array_elements_text(filter->'value') value);
        END IF;
    END IF;

    -- Skip certain attributes
    IF attribute_name NOT IN ('fiscal_month_name_abb', 'fiscal_quarter_name_abb', 'fiscal_year','fiscal_week') THEN
        -- Handle the 'in' operator and format the where_clause
        IF operator = 'in' THEN
            IF where_clause = '' THEN
                where_clause := format('%I %s (%s)', attribute_name, operator, values);
            ELSE
                where_clause := where_clause || format(' AND %I %s (%s)', attribute_name, operator, values);
            END IF;
        ELSE
            RAISE NOTICE 'Unsupported operator: %', operator;
        END IF;
    END IF;
END LOOP;

-- Append the is_special_order condition if applicable
IF is_special_order_condition <> '' THEN
    where_clause := where_clause || ' AND ' || is_special_order_condition;
END IF;
 
 v_sql := format('
	with base as (
		select dept, wp.hierarchy_code , channel, current_week, bop_units, bop_cost, aoh_units, aoh_cost, 
			row_number() over (partition by channel, wp.hierarchy_code order by current_week) as rank_col,
			sum(written_sales_units) over (partition by channel,wp.hierarchy_code order by current_week) as written_sales_units,
			sum(written_sales_cost) over (partition by channel,wp.hierarchy_code order by current_week) as written_sales_cost,
			sum(delivered_net_sales_units) over (partition by channel,wp.hierarchy_code order by current_week) as delivered_net_sales_units,
			sum(delivered_net_sales_cost) over (partition by channel,wp.hierarchy_code order by current_week) as delivered_net_sales_cost,
			sum(total_receipt_units) over (partition by channel,wp.hierarchy_code order by current_week) as total_receipt_units,
			sum(total_receipt_cost) over (partition by channel,wp.hierarchy_code order by current_week) as total_receipt_cost,
			sum(coalesce(inv_adj_units,0)) over (partition by channel,wp.hierarchy_code order by current_week) as inv_adj_units,
			sum(coalesce(inv_adj_cost,0)) over (partition by channel,wp.hierarchy_code order by current_week) as inv_adj_cost
		from ' || wp_table_name ||' wp 
		join 
	    (select hierarchy_code
		from item_smart.mv_product_hierarchies_filter
		where ' || where_clause ||'
		union all 
		select hierarchy_code
		from item_smart.placeholders_info
		where ' || where_clause ||')
	 	phf
		on wp.hierarchy_code = phf.hierarchy_code 
		WHERE current_week between (SELECT distinct fiscal_year_week FROM "global".fiscal_date_mapping WHERE calendar_date = ''' || sdate ||''' )
		and (SELECT distinct fiscal_year_week FROM "global".fiscal_date_mapping WHERE calendar_date = (current_date::date + interval ''2 YEARS 6 months'') )
	--	order by 3,2,4
		),
	non_bop_cumulatives as (
		select dept, hierarchy_code, current_week,
			sum(written_sales_units) written_sales_units,
			sum(written_sales_cost) written_sales_cost,
			sum(delivered_net_sales_units) delivered_net_sales_units,
			sum(delivered_net_sales_cost) delivered_net_sales_cost,
			sum(total_receipt_units) total_receipt_units,
			sum(total_receipt_cost) total_receipt_cost,
			sum(inv_adj_units) inv_adj_units,
			sum(inv_adj_cost) inv_adj_cost
		from base a
		group by 1,2,3
		),
	bop_cumulative as (
		select dept, hierarchy_code, 
			sum(case when rank_col = 1 then bop_units else 0 end) as bop_units,
			sum(case when rank_col = 1 then bop_cost else 0 end) as bop_cost,
			sum(case when rank_col = 1 then aoh_units else 0 end) as aoh_units,
			sum(case when rank_col = 1 then aoh_cost else 0 end) as aoh_cost
		from base
		group by 1,2
	) ,
	
base_final as (
	select dept, hierarchy_code, current_week, channel,
			bop_units, bop_cost, aoh_cost, aoh_units, 
			(aoh_units + total_receipt_units) atp_units, 
			(aoh_cost + total_receipt_cost) atp_cost,
			eop_units, eop_cost, aoh_cost_eop, aoh_units_eop
	from (
		select eop_vals.* , 
			lag(eop_units) over (partition by hierarchy_code order by current_week) as bop_units,
			lag(eop_cost) over (partition by hierarchy_code order by current_week) as bop_cost,
			lag(aoh_cost_eop) over (partition by hierarchy_code order by current_week) as aoh_cost,
			lag(aoh_units_eop) over (partition by hierarchy_code order by current_week) as aoh_units
		from(
			select dept, hierarchy_code, current_week, ''Warehouse'' as channel,
				(bc.bop_units - nbc.delivered_net_sales_units + nbc.total_receipt_units - nbc.inv_adj_units) as eop_units,
				(bc.bop_cost - nbc.delivered_net_sales_cost + nbc.total_receipt_cost - nbc.inv_adj_cost) as eop_cost,
				(bc.aoh_units - nbc.written_sales_units + nbc.total_receipt_units - nbc.inv_adj_units) as aoh_units_eop,
				(bc.aoh_cost - nbc.written_sales_cost + nbc.total_receipt_cost - nbc.inv_adj_cost) as aoh_cost_eop,
				total_receipt_units, total_receipt_cost
			from bop_cumulative bc
			left join non_bop_cumulatives nbc
			using(dept, hierarchy_code)
	--		order by 1,2,3
			) eop_vals
	) final_eop )

    
UPDATE
    ' || wp_table_name ||' 
set
dept= bf.dept,
hierarchy_code= bf.hierarchy_code,
current_week= bf.current_week,
channel= bf.channel,
bop_units= bf.bop_units,
aoh_cost= bf.aoh_cost,
aoh_units= bf.aoh_units,
atp_units= bf.atp_units,
atp_cost= bf.atp_cost,
eop_units= bf.eop_units,
aoh_cost_eop = bf.aoh_cost_eop,
aoh_units_eop = bf.aoh_units_eop,
eop_cost = bf.eop_cost
    

FROM
    base_final bf
WHERE
    bf.channel = ' || wp_table_name ||'.channel
    AND bf.hierarchy_code = ' || wp_table_name ||'.hierarchy_code
    AND bf.current_week = ' || wp_table_name ||'.current_week;



', sdate,wp_table_name,where_clause);
    
   RAISE NOTICE 'v_sql : %', v_sql;
  
 
  	EXECUTE v_sql;

  
 	GET DIAGNOSTICS v_affected_rows = ROW_COUNT;

  RETURN v_affected_rows;
END;
$function$
;
