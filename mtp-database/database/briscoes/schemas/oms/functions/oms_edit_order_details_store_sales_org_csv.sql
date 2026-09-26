--liquibase formatted sql
--changeset priyansh.gautamy@impactanalytics.co:oms_edit_order_details_store_sales_org_csv_v2 runOnChange:true stripComments:false splitStatements:false context:Release_1 labels:MTP-134959
--comment: MTP-134959 - Initial commit
--rollback: SELECT 1

DROP FUNCTION IF EXISTS inventory_smart.oms_edit_order_details_store_sales_org_csv(text, int, jsonb);
DROP FUNCTION IF EXISTS inventory_smart.oms_edit_order_details_store_sales_org_csv(text, int, jsonb, jsonb);


CREATE OR REPLACE FUNCTION inventory_smart.oms_edit_order_details_store_sales_org_csv(
    p_table_name text,
    p_user_id int,
     p_product_filters jsonb,
    p_fiscal_timeperiod_ids jsonb DEFAULT '[]'::jsonb
)
RETURNS text
LANGUAGE plpgsql
AS $function$
DECLARE
    _query text;
    v_fiscal_ids int[];
    v_fiscal_filter text := '';
    v_pa_sql text := '';
BEGIN
    -- Build product filters
	v_pa_sql := inventory_smart.form_main_table_filters('t', p_product_filters);
	v_pa_sql := COALESCE(REPLACE(LTRIM(v_pa_sql), 'WHERE ', ' AND '), '');
    -- Parse fiscal_timeperiod_ids
    SELECT COALESCE(array_agg(value::int), ARRAY[]::int[])
    INTO v_fiscal_ids
    FROM jsonb_array_elements_text(p_fiscal_timeperiod_ids) AS t(value);
    -- Build fiscal timeperiod filter if IDs provided
    IF array_length(v_fiscal_ids, 1) > 0 THEN
        v_fiscal_filter := ' AND t.fiscal_year_week = ANY(ARRAY[' || array_to_string(v_fiscal_ids, ',') || '])';
    END IF;
    -- Update order_quantity for each id based on CSV values
    _query := format('
        UPDATE inventory_smart.oms_orders_recommended_store t
        SET 
            order_quantity = (
                CASE 
                    -- Case 1: total_roq > 0 → use roq_constrained formula
                    WHEN csv.total_roq > 0 THEN 
                        CEIL((csv.value::float * t.roq_constrained::float / csv.total_roq::float))::int
                    
                    -- Case 2: total_roq = 0 → equal distribution
                    ELSE 
                        CEIL((csv.value::float / NULLIF(csv.count, 0)))::int
                END
            ),
            order_gen_type = CASE 
                WHEN t.order_gen_type != ''Manual'' THEN ''Edited'' 
                ELSE t.order_gen_type 
            END,
            updated_at = now(),
            updated_by = $1
        FROM public.%I csv
        WHERE t.id = csv.id%s%s
    ', p_table_name, v_pa_sql, v_fiscal_filter);
    
    RAISE NOTICE 'oms_edit_order_details_store_sales_org_csv: %', _query;
    
    EXECUTE _query USING p_user_id;
    
    RETURN 'done successfully';
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN 'error: ' || SQLERRM;
END;
$function$;