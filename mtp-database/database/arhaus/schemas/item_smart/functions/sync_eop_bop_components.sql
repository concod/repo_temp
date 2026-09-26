--liquibase formatted sql
--changeset rishabh.swarnkar@impactanalytics.co:sync_eop_bop_components runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:sync_eop_bop_components 
--comment: sync_eop_bop_components updated
--rollback: SELECT 1

DROP FUNCTION IF EXISTS item_smart.sync_eop_bop_components(date, jsonb, text, text);

CREATE OR REPLACE FUNCTION item_smart.sync_eop_bop_components(sdate date, filters jsonb, dept text, planing_level text)
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
  start_week_id      integer;
  start_week_id_frm_wp  integer;
  start_week_id_frm_fm   integer;
BEGIN
  wp_table_name := 'item_smart.wp_components';

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


EXECUTE format('SELECT distinct fiscal_year_week FROM "global".fiscal_date_mapping WHERE calendar_date = %L LIMIT 1', 
    sdate
) INTO start_week_id_frm_fm;

RAISE NOTICE 'start week_id from fm : %', start_week_id_frm_fm;

EXECUTE format('SELECT MIN(current_week) FROM %s  LIMIT 1', 
    wp_table_name
) INTO start_week_id_frm_wp;

RAISE NOTICE 'start week_id from wp : %', start_week_id_frm_wp;


	-- get max of two values
SELECT GREATEST(start_week_id_frm_fm, start_week_id_frm_wp) INTO start_week_id;
 
 v_sql := format('
	with base as (
		select dept, wp.hierarchy_code ,wp.master_hierarchy_code, channel, current_week, bop_units, bop_cost, aoh_units, aoh_cost, 
total_receipt_units as total_receipt_units_wk,
			total_receipt_cost as total_receipt_cost_wk,
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
		on wp.master_hierarchy_code = phf.hierarchy_code 
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
			sum(inv_adj_cost) inv_adj_cost,
			sum(total_receipt_units_wk) total_receipt_units_wk,
			sum(total_receipt_cost_wk) total_receipt_cost_wk
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
			(COALESCE(aoh_units, 0) + COALESCE(total_receipt_units_wk, 0)) AS atp_units, 
			(COALESCE(aoh_cost,0) + COALESCE(total_receipt_cost_wk,0)) atp_cost,
			eop_units, eop_cost, aoh_cost_eop, aoh_units_eop,(bop_units / NULLIF(bop_cost, 0)) AS bop_auc,eop_auc
	from (
		select eop_vals.* , 
			lag(eop_units) over (partition by hierarchy_code order by current_week) as bop_units,
			lag(eop_cost) over (partition by hierarchy_code order by current_week) as bop_cost,
			lag(aoh_cost_eop) over (partition by hierarchy_code order by current_week) as aoh_cost,
			lag(aoh_units_eop) over (partition by hierarchy_code order by current_week) as aoh_units
		from(
			select dept, hierarchy_code, current_week, ''Warehouse'' as channel,
				(COALESCE(bc.bop_units, 0) - COALESCE(nbc.delivered_net_sales_units, 0) + COALESCE(nbc.total_receipt_units, 0) - COALESCE(nbc.inv_adj_units, 0)) as eop_units,
				(COALESCE(bc.bop_cost, 0) - COALESCE(nbc.delivered_net_sales_cost, 0) + COALESCE(nbc.total_receipt_cost, 0) - COALESCE(nbc.inv_adj_cost, 0)) as eop_cost,
				(COALESCE(bc.aoh_units, 0) - COALESCE(nbc.written_sales_units, 0) + COALESCE(nbc.total_receipt_units, 0) - COALESCE(nbc.inv_adj_units, 0)) as aoh_units_eop,
				(COALESCE(bc.aoh_cost, 0) - COALESCE(nbc.written_sales_cost, 0) + COALESCE(nbc.total_receipt_cost, 0) - COALESCE(nbc.inv_adj_cost, 0)) as aoh_cost_eop,
				(COALESCE(bc.bop_units, 0) - COALESCE(nbc.delivered_net_sales_units, 0) + COALESCE(nbc.total_receipt_units, 0) - COALESCE(nbc.inv_adj_units, 0)) / 
					NULLIF(COALESCE(bc.bop_cost, 0) - COALESCE(nbc.delivered_net_sales_cost, 0) + COALESCE(nbc.total_receipt_cost, 0) - COALESCE(nbc.inv_adj_cost, 0), 0) as eop_auc,
				total_receipt_units_wk, total_receipt_cost_wk
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
bop_units = CASE 
                    WHEN ' || wp_table_name ||'.current_week > ' || start_week_id || ' 
                    THEN bf.bop_units 
                    ELSE ' || wp_table_name ||'.bop_units 
                END,
bop_cost = CASE 
                    WHEN ' || wp_table_name ||'.current_week > ' || start_week_id || ' 
                    THEN bf.bop_cost 
                    ELSE ' || wp_table_name ||'.bop_cost 
                END,
bop_auc = CASE 
                    WHEN ' || wp_table_name ||'.current_week > ' || start_week_id || ' 
                    THEN bf.bop_auc 
                    ELSE ' || wp_table_name ||'.bop_auc 
                END,
aoh_cost= bf.aoh_cost,
aoh_units= bf.aoh_units,
atp_units= bf.atp_units,
atp_cost= bf.atp_cost,
eop_units= bf.eop_units,
aoh_cost_eop = bf.aoh_cost_eop,
aoh_units_eop = bf.aoh_units_eop,
eop_cost = bf.eop_cost,
eop_auc = bf.eop_auc
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
