--liquibase formatted sql
--changeset chandra.nil.ghosh:Added_deep_dive_filter_data_by_draft_helper_3 runOnChange:true stripComments:false splitStatements:false context:MTP-56850 labels:filter_data_by_draft_helper
--comment: Created filter_data_helper function
--rollback: SELECT 1

DROP FUNCTION IF EXISTS inventory_smart.get_oms_offcycle_deep_dive_filter(text, jsonb);

CREATE OR REPLACE FUNCTION inventory_smart.get_oms_offcycle_deep_dive_filter(
    draft_id text,
    product_attribute_filter jsonb DEFAULT '{}'::jsonb
)
RETURNS SETOF jsonb
LANGUAGE plpgsql
AS $function$

DECLARE
    v_draft_id_int int4;
    v_product_filter_sql TEXT := '';
    v_where_clause TEXT := '';
BEGIN
    IF draft_id IS NULL THEN
        RAISE EXCEPTION 'draft_id is mandatory';
    END IF;

    v_draft_id_int := draft_id::int4;

    -- Build product filter SQL using form_main_table_filters
    IF product_attribute_filter IS NOT NULL 
       AND product_attribute_filter != '{}'::jsonb 
       AND product_attribute_filter != '[]'::jsonb THEN
        v_product_filter_sql := inventory_smart.form_main_table_filters(
            'product_attributes_filter', product_attribute_filter);
    END IF;

    -- Build WHERE clause - apply filter conditions directly to oms_cof_orders_recommended
    -- form_main_table_filters returns WHERE clause for product_attributes_filter table
    -- We need to adapt it for oms_cof_orders_recommended columns (article, loc_code)
    IF v_product_filter_sql != '' THEN
        -- Replace table references to work with ocr alias
        v_where_clause := ' AND ' || REPLACE(REPLACE(v_product_filter_sql, 'product_attributes_filter.', 'ocr.'), 'WHERE ', '');
    END IF;

    RETURN QUERY EXECUTE '
        SELECT jsonb_build_object(
            ''article'', jsonb_agg(DISTINCT ocr.article) FILTER (WHERE ocr.article IS NOT NULL),
            ''loc_code'', jsonb_agg(DISTINCT ocr.loc_code) FILTER (WHERE ocr.loc_code IS NOT NULL),
            ''size'', jsonb_agg(DISTINCT ocr.size) FILTER (WHERE ocr.size IS NOT NULL)
        )
        FROM inventory_smart.oms_cof_orders_recommended ocr
        WHERE ocr.draft_id = ' || v_draft_id_int || '
          AND ocr.article IS NOT NULL
          AND ocr.is_approved = FALSE
          AND ocr.loc_code IS NOT NULL' || v_where_clause;

END;

$function$;
