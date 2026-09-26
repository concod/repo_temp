--liquibase formatted sql
--changeset hemant.kumar@impactanalytics.co:sync_eop_bop_v3_fix runOnChange:true stripComments:false splitStatements:false context:query_updated2  labels:item_smart_initial_commit
--comment: initial changeset for sync_eop_bop_v3_fix
--rollback: SELECT 1

DROP FUNCTION IF EXISTS  item_smart.sync_eop_bop_v3(date, jsonb, text, text, _int4);

CREATE OR REPLACE FUNCTION item_smart.sync_eop_bop_v3(sdate date, filters jsonb, dept text, planing_level text, hierarchy_code_list integer[])
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
    select dept, wp.hierarchy_code, channel, sub_channel, current_week, bop_units, bop_cost, written_auc, bop_auc,
        row_number() over (partition by channel, sub_channel, wp.hierarchy_code order by current_week) as rank_col,
      COALESCE(SUM(written_sales_units) OVER (PARTITION BY channel, sub_channel, wp.hierarchy_code ORDER BY current_week), 0) AS written_sales_units,
            COALESCE(SUM(written_sales_cost) OVER (PARTITION BY channel, sub_channel, wp.hierarchy_code ORDER BY current_week), 0) AS written_sales_cost,
            COALESCE(SUM(total_receipt_units) OVER (PARTITION BY channel, sub_channel, wp.hierarchy_code ORDER BY current_week), 0) AS total_receipt_units,
            COALESCE(SUM(total_receipt_cost) OVER (PARTITION BY channel, sub_channel, wp.hierarchy_code ORDER BY current_week), 0) AS total_receipt_cost,
            COALESCE(SUM(return_inv) OVER (PARTITION BY channel, sub_channel, wp.hierarchy_code ORDER BY current_week), 0) AS return_inv   
		from ' || wp_table_name ||' wp  
		WHERE wp.hierarchy_code = ANY(ARRAY[' || array_to_string(hierarchy_code_list, ',') || '])
        and  current_week between (SELECT distinct fiscal_year_week FROM "global".fiscal_date_mapping WHERE calendar_date = ''' || sdate ||''' )
		and (SELECT distinct fiscal_year_week FROM "global".fiscal_date_mapping WHERE calendar_date = ''' || max_date ||''' )

		),

written_auc_data as (
    select distinct
        hierarchy_code, channel,
        first_value(written_auc) over (partition by hierarchy_code,channel order by current_week) as written_auc
    from base
),
	non_bop_cumulatives as (
    select dept, hierarchy_code, channel,current_week,
        sum(written_sales_units) written_sales_units,        -- Sum across ALL sub_channels
        sum(written_sales_cost) written_sales_cost,          -- Sum across ALL sub_channels
        sum(total_receipt_units) total_receipt_units,        -- Sum across ALL sub_channels
        sum(total_receipt_cost) total_receipt_cost,          -- Sum across ALL sub_channels
        sum(return_inv) return_inv                           -- Sum across ALL sub_channels
    from base 
    group by 1,2,3 ,4                               
)
--select * from non_bop_cumulatives
,
	bop_cumulative as (
    select 
        b.dept, 
        b.hierarchy_code, 
        b.channel, 
        b.sub_channel,
        COALESCE(SUM(CASE WHEN rank_col = 1 THEN bop_units ELSE 0 END), 0) AS bop_units,
        COALESCE(SUM(CASE WHEN rank_col = 1 THEN bop_cost ELSE 0 END), 0) AS bop_cost,
        COALESCE(SUM(CASE WHEN rank_col = 1 THEN bop_auc ELSE 0 END), 0) AS bop_auc,
        w.written_auc
    from base b
    join written_auc_data w using(hierarchy_code,channel)
    where b.sub_channel like ''%%warehouse''
    group by 1,2,3,4,8
)
--select * from bop_cumulative
	,
base_final as (
    select dept, hierarchy_code, current_week, channel, sub_channel,
        bop_units,eop_units, bop_cost,  eop_cost, bop_auc, eop_auc
    from (
        select eop_vals.*, 
            lag(eop_units) over (partition by hierarchy_code, channel, sub_channel order by current_week) as bop_units,
			lag(eop_cost) over (partition by hierarchy_code, channel, sub_channel order by current_week) as bop_cost,
			lag(eop_auc) over (partition by hierarchy_code, channel, sub_channel order by current_week) as bop_auc
        from (
            select 
                bc.dept, 
                bc.hierarchy_code, 
                nbc.current_week, 
                bc.channel, 
                bc.sub_channel,
                                
                
                    (COALESCE(bc.bop_units, 0) - COALESCE(nbc.written_sales_units, 0) + 
                    COALESCE(nbc.total_receipt_units, 0) + COALESCE(nbc.return_inv, 0))
                        as eop_units,

                    (COALESCE(bc.bop_cost, 0) - COALESCE(nbc.written_sales_cost, 0) + 
                    COALESCE(nbc.total_receipt_cost, 0) + COALESCE(nbc.return_inv, 0) * COALESCE(bc.written_auc, 0))
                        as eop_cost,
                    CASE 
                    WHEN (COALESCE(bc.bop_units, 0) - COALESCE(nbc.written_sales_units, 0) + 
                          COALESCE(nbc.total_receipt_units, 0) + COALESCE(nbc.return_inv, 0)) = 0 THEN 0
                    ELSE (COALESCE(bc.bop_cost, 0) - COALESCE(nbc.written_sales_cost, 0) + 
                          COALESCE(nbc.total_receipt_cost, 0) + COALESCE(nbc.return_inv, 0) * COALESCE(bc.written_auc, 0)) / 
                         (COALESCE(bc.bop_units, 0) - COALESCE(nbc.written_sales_units, 0) + 
                          COALESCE(nbc.total_receipt_units, 0) + COALESCE(nbc.return_inv, 0))
                    END AS eop_auc
            from bop_cumulative bc
            join non_bop_cumulatives nbc
            on bc.dept = nbc.dept 
            and bc.hierarchy_code = nbc.hierarchy_code
			and bc.channel = nbc.channel
            and nbc.current_week is not null
        ) eop_vals
    ) final_eop
)

--select * from base_final



UPDATE ' || wp_table_name ||' 
SET
    eop_units = bf.eop_units,
    eop_auc = bf.eop_auc,
    eop_cost = bf.eop_cost,
    updated_at = now(),
    bop_units = CASE 
                    WHEN ' || wp_table_name ||'.current_week > ' || start_week_id || ' 
                    THEN bf.bop_units 
                    ELSE ' || wp_table_name ||'.bop_units 
                END,
    bop_auc = CASE 
                    WHEN ' || wp_table_name ||'.current_week > ' || start_week_id || ' 
                    THEN bf.bop_auc 
                    ELSE ' || wp_table_name ||'.bop_auc 
                END,
    bop_cost = CASE 
                    WHEN ' || wp_table_name ||'.current_week > ' || start_week_id || ' 
                    THEN bf.bop_cost 
                    ELSE ' || wp_table_name ||'.bop_cost 
                END
FROM base_final bf
WHERE
    bf.channel = ' || wp_table_name ||'.channel
    AND bf.hierarchy_code = ' || wp_table_name ||'.hierarchy_code
    AND bf.current_week = ' || wp_table_name ||'.current_week
    AND bf.sub_channel = ' || wp_table_name ||'.sub_channel
    
;
', sdate,wp_table_name,where_clause,hierarchy_code_list);
    
   RAISE NOTICE 'v_sql : %', v_sql;
  
 
  	EXECUTE v_sql;
  
 	GET DIAGNOSTICS v_affected_rows = ROW_COUNT;
  RETURN v_affected_rows;
END;
$function$
;
