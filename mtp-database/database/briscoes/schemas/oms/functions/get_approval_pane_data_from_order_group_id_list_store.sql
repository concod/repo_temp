--liquibase formatted sql
--changeset priyansh.gautam@impactanalytics.co:get_approval_pane_data_from_order_group_id_list_store_update6 runOnChange:true stripComments:false splitStatements:false context:MTP-98964 labels:MTP-112492
--comment: updating_condition_based_on_order_group_id
--rollback: SELECT 1

DROP FUNCTION IF EXISTS inventory_smart.get_approval_pane_data_from_order_group_id_list_store(_text, _text, _text, _text, _text, _text, _text, _text, _text, _text, text, text, jsonb, jsonb, jsonb, _text);
CREATE OR REPLACE FUNCTION inventory_smart.get_approval_pane_data_from_order_group_id_list_store(l0_name text[], l1_name text[], l2_name text[], l3_name text[], l5_name text[], l6_name text[], order_type text[], region_name text[], sales_org_name text[], article text[], start_order_placement_date text, end_order_placement_date text, product_filter jsonb, meta_filter jsonb, store_filter jsonb, order_group_id_list text[])
 RETURNS TABLE(article_data character varying, store_code_data character varying, order_placement_date date, editable_expected_receipt_date date, order_quantity integer, style_name text, total_count integer, total_order_qty integer, status_obj json)
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_pa_sql text := '';
	v_sa_sql text := '';
    v_recommended_orders_sql text := '';
    v_l0_name text := '';
    v_l1_name text := '';
    v_l2_name text := '';
    v_l3_name text := '';
    v_l5_name text := '';
    v_l6_name text := '';
    v_sales_org_name text := '';
    v_region_name text := '';
    v_where_conditions text := '';
    v_order_type text := '';
    v_article text := '';
    v_order_placement_date text := '';
    v_where_clause text := '';
    v_meta_cls text := '';
    v_limit_clause text := '';
    v_order_clause text := '';
    v_size_sort jsonb := NULL;
    v_order_direction text := 'ASC';
    v_meta_filter_processed jsonb := meta_filter;
BEGIN
    -- Handle the iso format date(yyyy-mm-dd). ISO date will be received when user input is null
    IF end_order_placement_date ~ '^\d{4}-\d{1,2}-\d{1,2}$' OR  start_order_placement_date ~ '^\d{4}-\d{1,2}-\d{1,2}$' THEN
        -- check if date is in format of yyyy-mm-dd
        start_order_placement_date := '';
        end_order_placement_date := '';
        RAISE NOTICE 'ISO format detected - setting both dates to empty (no date filtering)';
    END IF;

    -- Extract size sort from meta_filter if present
    IF v_meta_filter_processed IS NOT NULL AND jsonb_typeof(v_meta_filter_processed) = 'object' AND v_meta_filter_processed <> '{}'::jsonb THEN
        -- Check if size is in sort array and remove it
        IF v_meta_filter_processed->'sort' IS NOT NULL AND jsonb_array_length(v_meta_filter_processed->'sort') > 0 THEN
            FOR i IN 0..jsonb_array_length(v_meta_filter_processed->'sort')-1 LOOP
                IF (v_meta_filter_processed->'sort'->i->>'column') = 'size' THEN
                    v_size_sort := v_meta_filter_processed->'sort'->i;
                    -- Remove size from sort array
                    v_meta_filter_processed := jsonb_set(
                        v_meta_filter_processed,
                        '{sort}',
                        (v_meta_filter_processed->'sort') - i
                    );
                    EXIT;
                END IF;
            END LOOP;
        END IF;
    END IF;

    -- Handle size sorting direction
    IF v_size_sort IS NOT NULL AND v_size_sort->>'order' = 'desc' THEN
        v_order_direction := 'DESC';
    ELSE
        v_order_direction := 'ASC';
    END IF;

    IF v_meta_filter_processed <> '{}' THEN
        v_meta_cls := global.form_table_query(v_meta_filter_processed);

        IF v_meta_cls ~* 'WHERE' THEN
            v_where_clause := substring(v_meta_cls FROM 'WHERE\s.*?(?=\sLIMIT|\sOFFSET|$)');
        END IF;

        IF v_meta_cls ~* 'LIMIT' THEN
            v_limit_clause := substring(v_meta_cls FROM 'LIMIT\s.*$');
        END IF;

        IF v_meta_cls ~* 'ORDER BY' THEN
            v_order_clause := substring(v_meta_cls FROM 'ORDER\sBY\s.*?(?=\sLIMIT|\sOFFSET|$)');
        END IF;
    END IF;

    v_pa_sql := inventory_smart.form_main_table_filters('ph_master', product_filter);
	v_sa_sql := global.form_main_table_filters(
	    'store_attributes_filter'::Text,
	    store_filter::jsonb
  	);

    IF l0_name IS NOT NULL AND array_length(l0_name, 1) > 0 THEN
        v_where_conditions := v_where_conditions || 'and oors.l0_name = ANY('|| quote_literal(l0_name) ||')';
    END IF;

    IF l1_name IS NOT NULL AND array_length(l1_name, 1) > 0 THEN
        v_where_conditions := v_where_conditions || 'and oors.l1_name = ANY('|| quote_literal(l1_name) ||')';
    END IF;

    IF l2_name IS NOT NULL AND array_length(l2_name, 1) > 0 THEN
        v_where_conditions := v_where_conditions || 'and oors.l2_name = ANY('|| quote_literal(l2_name) ||')';
    END IF;

    IF l3_name IS NOT NULL AND array_length(l3_name, 1) > 0 THEN
        v_where_conditions := v_where_conditions || 'and oors.l3_name = ANY('|| quote_literal(l3_name) ||')';
    END IF;

    IF l5_name IS NOT NULL AND array_length(l5_name, 1) > 0 THEN
        v_where_conditions := v_where_conditions || 'and oors.l5_name = ANY('|| quote_literal(l5_name) ||')';
    END IF;

    IF l6_name IS NOT NULL AND array_length(l6_name, 1) > 0 THEN
        v_where_conditions := v_where_conditions || 'and oors.l6_name = ANY('|| quote_literal(l6_name) ||')';
    END IF;

    IF region_name IS NOT NULL AND array_length(region_name, 1) > 0 THEN
        v_where_conditions := v_where_conditions || 'and oors.region_name = ANY('|| quote_literal(region_name) ||')';
    END IF;

	IF sales_org_name IS NOT NULL AND array_length(sales_org_name, 1) > 0 THEN
        v_where_conditions := v_where_conditions || 'and oors.sales_org_name = ANY('|| quote_literal(sales_org_name) ||')';
    END IF;

    IF order_type IS NOT NULL AND array_length(order_type, 1) > 0 THEN
        v_where_conditions := v_where_conditions || 'and oors.order_type = ANY('|| quote_literal(order_type) ||')';
    END IF;

    IF article IS NOT NULL AND array_length(article, 1) > 0 THEN
        v_where_conditions := v_where_conditions || 'and oors.article = ANY('|| quote_literal(article) ||')';
    END IF;

    IF end_order_placement_date IS NOT NULL AND start_order_placement_date IS NOT NULL 
        AND end_order_placement_date <> '' AND start_order_placement_date <> '' THEN
            v_where_conditions := v_where_conditions || 'and oors.order_placement_date between TO_DATE(' || 
                quote_literal(start_order_placement_date) || ', ''DD-MM-YYYY'') and TO_DATE(' || 
                quote_literal(end_order_placement_date) || ', ''DD-MM-YYYY'')';
    END IF;

    -- Generate order group id filter dynamically
    IF order_group_id_list IS NOT NULL AND array_length(order_group_id_list, 1) > 0 THEN
        v_where_conditions :=  v_where_conditions || 'and oors.order_group_id = ANY(' || quote_literal(order_group_id_list) || ')';
        --v_order_group_id_filter := 'and oors.order_group_id = ANY(' || quote_literal(order_group_id_list) || ')';
    --ELSE
    --    v_order_group_id_filter := '0=1'; -- No order group id filter applied if the array is empty
    END IF;

    v_recommended_orders_sql := '
    WITH store_filter AS (
        SELECT store_code
        FROM global.store_attributes_filter
        ' || v_sa_sql || '
    ),
    oors_product_filter AS (
        SELECT oors.*
        FROM inventory_smart.oms_orders_recommended_store oors
        inner join store_filter saf on saf.store_code = oors.store_code
        ' || v_pa_sql || ' and oors.order_status_id = 0 ' || v_where_conditions || '
    ),
    valid_groups AS (
        SELECT oors.order_group_id
        FROM oors_product_filter oors
        GROUP BY oors.order_group_id
        HAVING SUM(oors.order_quantity) > 0
    ),
    article_status_tag AS (
        SELECT product_code, size, MIN("order") AS "order"
        FROM inventory_smart.article_status_tag
        GROUP BY product_code, size
    ),
    base_data AS (
        SELECT 
            oors.article AS article_data,
            oors.store_code AS store_code_data,
            oors.order_placement_date,
            oors.order_group_id,
            oors.editable_expected_receipt_date,
            oors.order_type AS order_type_data,
            oors.order_quantity,
            oors.size,
            COALESCE(ast."order", 999999) AS size_order,
            oors.style_name
        FROM oors_product_filter oors
        INNER JOIN valid_groups vg
            ON oors.order_group_id = vg.order_group_id
        LEFT JOIN article_status_tag ast 
            ON ast.size = oors.size AND ast.product_code = oors.product_code
    ),
    total AS (
        select
        COUNT(*)::int AS total_count,
        SUM(order_quantity)::int AS total_order_qty 
        FROM base_data
	)
    SELECT
        article_data,
        store_code_data,
        order_placement_date,
        max(editable_expected_receipt_date) as editable_expected_receipt_date,
        sum(order_quantity)::int as order_quantity,
        max(style_name) as style_name,
        (SELECT total_count FROM total) AS total_count,
        (SELECT total_order_qty FROM total) AS total_order_qty,
        JSON_AGG(
            JSON_BUILD_OBJECT(
                ''store_code_data'',store_code_data,
                ''style_name'',style_name,
                ''article_data'',article_data,
                ''size'',size,
                ''order_quantity'',order_quantity,
                ''order_placement_date'',order_placement_date,
                ''editable_expected_receipt_date'',editable_expected_receipt_date,
                ''order_group_id'',order_group_id,
                ''order_type_data'',order_type_data
            )
            ORDER BY size_order ' || v_order_direction || '
        ) AS status_obj
    FROM base_data bd
    group by 1,2,3
    ' || v_order_clause || '
    ' || v_limit_clause || '
    ';

    RAISE NOTICE 'v_recommended_orders_sql %', v_recommended_orders_sql;
    RETURN QUERY EXECUTE v_recommended_orders_sql;
END;
$function$
;
