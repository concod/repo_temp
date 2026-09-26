--liquibase formatted sql
--changeset chandra.nil.ghosh:Added_get_oms_offcycle_aggr_columns runOnChange:true stripComments:false splitStatements:false context:MTP-56850 labels:get_offcycle_columns_api
--comment: Created get_offcycle_columns_api function
--rollback: SELECT 1

DROP FUNCTION IF EXISTS inventory_smart.get_offcycle_unique_row_ids(text, jsonb);

CREATE OR REPLACE FUNCTION inventory_smart.get_offcycle_unique_row_ids(draft_id text, filters jsonb DEFAULT '[]'::jsonb)
 RETURNS SETOF text
 LANGUAGE plpgsql
AS $function$

DECLARE
    v_draft_id_int int4;
    v_product_filter_sql TEXT := '';
    v_where_clause TEXT := '';
BEGIN
    IF draft_id IS NULL OR draft_id = '' THEN
        RAISE EXCEPTION 'draft_id is mandatory';
    END IF;

    v_draft_id_int := draft_id::int4;

    -- Build product filter SQL using form_main_table_filters if filters exist
    IF filters IS NOT NULL 
       AND filters != '[]'::jsonb 
       AND filters != '{}'::jsonb 
       AND jsonb_array_length(filters) > 0 THEN
        v_product_filter_sql := inventory_smart.form_main_table_filters(
            'product_attributes_filter', filters);
    END IF;

    -- Build WHERE clause
    v_where_clause := ' WHERE ocr.draft_id = ' || v_draft_id_int 
                     || ' AND ocr.article IS NOT NULL AND ocr.loc_code IS NOT NULL';
    
    IF v_product_filter_sql != '' THEN
        -- Replace table references to work with ocr alias
        v_product_filter_sql := REPLACE(REPLACE(v_product_filter_sql, 'product_attributes_filter.', 'ocr.'), 'WHERE ', '');
        v_where_clause := v_where_clause || ' AND ' || v_product_filter_sql;
    END IF;

    RETURN QUERY EXECUTE '
        SELECT DISTINCT CONCAT(ocr.article, ocr.loc_code) AS unique_row_id
        FROM inventory_smart.oms_cof_orders_recommended ocr
        ' || v_where_clause || '
        ORDER BY unique_row_id';

END;

$function$
;
