--liquibase formatted sql
--changeset hemant.kumar@impactanalytics.co:sync_eop_bop runOnChange:true stripComments:false splitStatements:false context:divide_by_zero labels:item_smart_initial_commit
--comment: initial changeset for sync_eop_bop
--rollback: SELECT 1

DROP FUNCTION IF EXISTS  item_smart.sync_eop_bop(date, jsonb, text, text);

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
  max_date         date;

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

EXECUTE 'SELECT fdm.calendar_date FROM global.fiscal_date_mapping fdm ORDER BY fdm.calendar_date DESC LIMIT 1' 
INTO max_date;

RAISE NOTICE 'max_date: %', max_date;

 
 v_sql := format('
	with base as (
		select dept, wp.hierarchy_code , channel,sub_channel ,current_week, bop_units, bop_cost,written_auc, 
			row_number() over (partition by channel, wp.hierarchy_code order by current_week) as rank_col,
			sum(written_sales_units) over (partition by channel,sub_channel,wp.hierarchy_code order by current_week) as written_sales_units,
			sum(written_sales_cost) over (partition by channel,sub_channel,wp.hierarchy_code order by current_week) as written_sales_cost,
			sum(total_receipt_units) over (partition by channel,sub_channel,wp.hierarchy_code order by current_week) as total_receipt_units,
			sum(total_receipt_cost) over (partition by channel,sub_channel,wp.hierarchy_code order by current_week) as total_receipt_cost,
			sum(return_inv) over (partition by channel,sub_channel,wp.hierarchy_code order by current_week) as return_inv
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
		and (SELECT distinct fiscal_year_week FROM "global".fiscal_date_mapping WHERE calendar_date = ''' || max_date ||''' )
	--	order by 3,2,4
		),
	non_bop_cumulatives as (
		select dept, hierarchy_code, current_week,channel,sub_channel,
			sum(written_sales_units) written_sales_units,
			sum(written_sales_cost) written_sales_cost,
			sum(total_receipt_units) total_receipt_units,
			sum(total_receipt_cost) total_receipt_cost,
			sum(return_inv) return_inv
		from base a
		group by 1,2,3,4,5
		),
	bop_cumulative as (
		select dept, hierarchy_code,  channel,sub_channel,
			sum(case when rank_col = 1 then bop_units else 0 end) as bop_units,
			sum(case when rank_col = 1 then bop_cost else 0 end) as bop_cost,
			sum(case when rank_col = 1 then written_auc else 0 end) as written_auc
		from base
		group by 1,2,3,4
	) ,
	
base_final as (
		select dept, hierarchy_code, current_week, channel,sub_channel,
			bop_units, bop_cost,eop_units, eop_cost,eop_auc
	from (
		select eop_vals.* , 
			lag(eop_units) over (partition by hierarchy_code order by current_week) as bop_units,
			lag(eop_cost) over (partition by hierarchy_code order by current_week) as bop_cost
		from(
			select dept, hierarchy_code, current_week,bc.channel,bc.sub_channel,
				(bc.bop_units - nbc.written_sales_units + nbc.total_receipt_units + nbc.return_inv) as eop_units,
				(bc.bop_cost - nbc.written_sales_cost + nbc.total_receipt_cost + nbc.return_inv * bc.written_auc) as eop_cost,
				((bc.bop_units - nbc.written_sales_units + nbc.total_receipt_units + nbc.return_inv) / NULLIF(bc.bop_cost - nbc.written_sales_cost + nbc.total_receipt_cost + nbc.return_inv * bc.written_auc, 0)) AS eop_auc
			from bop_cumulative bc
			left join non_bop_cumulatives nbc
			using(dept, hierarchy_code,channel,sub_channel)
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
sub_channel= bf.sub_channel,
eop_units= bf.eop_units,
eop_auc = bf.eop_auc,
eop_cost = bf.eop_cost
FROM
    base_final bf
WHERE
    bf.channel = ' || wp_table_name ||'.channel
    AND bf.hierarchy_code = ' || wp_table_name ||'.hierarchy_code
    AND bf.current_week = ' || wp_table_name ||'.current_week
	AND bf.sub_channel = ' || wp_table_name ||'.sub_channel;



', sdate,wp_table_name,where_clause);
    
   RAISE NOTICE 'v_sql : %', v_sql;
  
 
  	EXECUTE v_sql;

  
 	GET DIAGNOSTICS v_affected_rows = ROW_COUNT;

  RETURN v_affected_rows;
END;
$function$
;