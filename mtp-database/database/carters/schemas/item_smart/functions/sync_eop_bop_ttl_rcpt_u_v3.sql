--liquibase formatted sql
--changeset hemant.kumar@impactanalytics.co:sync_eop_bop_ttl_rcpt_u_v3 runOnChange:true stripComments:false splitStatements:false context:Release_1_0  labels:item_smart_initial_commit
--comment: initial changeset for sync_eop_bop_ttl_rcpt_u_v3
--rollback: SELECT 1
DROP FUNCTION IF EXISTS  item_smart.sync_eop_bop_ttl_rcpt_u_v3(date, jsonb, text, text, _int4, text);
CREATE OR REPLACE FUNCTION item_smart.sync_eop_bop_ttl_rcpt_u_v3(sdate date, filters jsonb, dept text, planing_level text, hierarchy_code_list integer[], p_channel text)
 RETURNS integer
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_sql            text;
    wp_table_name    text;
    v_affected_rows  integer;
    where_clause     text := '';
    filter           jsonb;
    attribute_name   text;
    values           text;
    operator         text;
    is_special_order_condition text;
    max_date         date;
    start_week_id    integer;
    start_week_id_frm_wp  integer;
    start_week_id_frm_fm   integer;
BEGIN
    wp_table_name := 'item_smart.wp_master_' || dept;
    
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
    SELECT GREATEST(start_week_id_frm_fm, start_week_id_frm_wp) INTO start_week_id;
    
If p_channel='Brick __ia_char_13 Mortar' then
    v_sql := format('
        UPDATE ' || wp_table_name ||' 
        SET
        
            -- BNM DC calculations
            bop_units_bnm_dc = COALESCE(bop_units, 0) - COALESCE(bop_units_bnm_store, 0),
            bop_cost_bnm_dc = COALESCE(bop_cost, 0) - COALESCE(bop_cost_bnm_store, 0),
            bop_auc_bnm_dc = CASE 
                WHEN (COALESCE(bop_units, 0) - COALESCE(bop_units_bnm_store, 0)) = 0 THEN 0
                ELSE (COALESCE(bop_cost, 0) - COALESCE(bop_cost_bnm_store, 0)) / 
                    (COALESCE(bop_units, 0) - COALESCE(bop_units_bnm_store, 0))
            END,
            -- EOP DC calculations
            eop_units_bnm_dc = COALESCE(eop_units, 0) - COALESCE(eop_units_bnm_store, 0),
            eop_cost_bnm_dc = COALESCE(eop_cost, 0) - COALESCE(eop_cost_bnm_store, 0),
            eop_auc_bnm_dc = CASE 
                WHEN (COALESCE(eop_units, 0) - COALESCE(eop_units_bnm_store, 0)) = 0 THEN 0
                ELSE (COALESCE(eop_cost, 0) - COALESCE(eop_cost_bnm_store, 0)) / 
                    (COALESCE(eop_units, 0) - COALESCE(eop_units_bnm_store, 0))
            END
             WHERE hierarchy_code = ANY(ARRAY[' || array_to_string(hierarchy_code_list, ',') || '])
        AND current_week between (SELECT distinct fiscal_year_week FROM "global".fiscal_date_mapping WHERE calendar_date = ''' || sdate ||''' )
        AND (SELECT distinct fiscal_year_week FROM "global".fiscal_date_mapping WHERE calendar_date = ''' || max_date ||''' )
        AND channel = ''' || p_channel || '''
    ', sdate, wp_table_name, where_clause, hierarchy_code_list);
    
    RAISE NOTICE 'v_sql : %', v_sql;
    
    EXECUTE v_sql;
   
elsif p_channel='E-Commerce' then
    v_sql := format('
        UPDATE ' || wp_table_name ||' 
        SET
            bop_units_ecom = COALESCE(bop_units, 0),
            bop_cost_ecom = COALESCE(bop_cost, 0),
            bop_auc_ecom = CASE 
                WHEN COALESCE(bop_units, 0) = 0 THEN 0
                ELSE COALESCE(bop_cost, 0) / COALESCE(bop_units, 0)
            END,
            eop_units_ecom = COALESCE(eop_units, 0),
            eop_cost_ecom = COALESCE(eop_cost, 0),
            eop_auc_ecom = CASE 
                WHEN COALESCE(eop_units, 0) = 0 THEN 0
                ELSE COALESCE(eop_cost, 0) / COALESCE(eop_units, 0)
            END
        WHERE hierarchy_code = ANY(ARRAY[' || array_to_string(hierarchy_code_list, ',') || '])
        AND current_week between (SELECT distinct fiscal_year_week FROM "global".fiscal_date_mapping WHERE calendar_date = ''' || sdate ||''' )
        AND (SELECT distinct fiscal_year_week FROM "global".fiscal_date_mapping WHERE calendar_date = ''' || max_date ||''' )
        AND channel = ''' || p_channel || '''
    ', sdate, wp_table_name, where_clause, hierarchy_code_list);
    RAISE NOTICE 'v_sql : %', v_sql;
    EXECUTE v_sql;
 end if;
    GET DIAGNOSTICS v_affected_rows = ROW_COUNT;
    RETURN v_affected_rows;
END;
$function$
;