--liquibase formatted sql
--changeset nikhil.madhusudan@impactanalytics.co:starboard_get_approval_orders_v7 runOnChange:true stripComments:false splitStatements:false context:Release_1_1 labels:starboard_oms_approval
--comment: Same pattern as primark/spanx/vs — IN params = filter column names; OUT columns use *_data (and loc_code_data, order_type_data) to avoid duplicate parameter names vs RETURNS TABLE
--rollback: SELECT 1

DROP FUNCTION IF EXISTS oms.get_approval_orders(_text, _text, _text, _text, _text, _text, _text, _text, date, date, jsonb, jsonb);
DROP FUNCTION IF EXISTS oms.get_approval_orders(_text, _text, _text, _text, _text, _text, _text, _text, _text, _text, date, date, jsonb, jsonb);
DROP FUNCTION IF EXISTS oms.get_approval_orders(_text, _text, _text, _text, _text, _text, _text, _text, _text, _text, date, date, jsonb, jsonb, _text);
DROP FUNCTION IF EXISTS oms.get_approval_orders(_text, _text, _text, _text, _text, _text, _text, date, date, jsonb, jsonb, _text);
DROP FUNCTION IF EXISTS oms.get_approval_orders(_text, _text, _text, _text, _text, date, date, jsonb, jsonb, _text);

CREATE OR REPLACE FUNCTION oms.get_approval_orders(
    article text[],
    l1_name text[],
    l2_name text[],
    l3_name text[],
    order_type text[],
    start_order_placement_date date,
    end_order_placement_date date,
    product_filter jsonb,
    meta_filter jsonb,
    order_group_id_list text[]
)
RETURNS TABLE (
    article_data character varying,
    style_color_desc character varying,
    l1_name_data text,
    l2_name_data text,
    l3_name_data text,
    size_data text,
    loc_code_data character varying,
    order_group_id text,
    order_id text,
    order_placement_date date,
    projected_delivery_date date,
    order_quantity integer,
    order_type_data text,
    status_obj json,
    total_count integer,
    total_order_qty integer
)
LANGUAGE plpgsql
AS $function$
DECLARE
    v_pa_sql text := '';
    v_recommended_orders_sql text := '';
    v_l1_name text := '';
    v_l2_name text := '';
    v_l3_name text := '';
    v_loc_code text := '';
    v_order_type text := '';
    v_order_placement_date text := '';
    v_article text := '';
    v_meta_cls TEXT := '';
    v_limit_clause TEXT := '';
    v_order_clause TEXT := '';
    v_where_clause TEXT := '';
    v_order_group_id_list text := '';
BEGIN
    IF meta_filter IS NOT NULL
       AND jsonb_typeof(meta_filter) = 'object'
       AND meta_filter <> '{}'::jsonb THEN

        v_meta_cls := global.form_table_query(meta_filter);

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

    v_pa_sql := oms.form_main_table_filters('ph_master', product_filter);

    IF l1_name IS NOT NULL AND array_length(l1_name, 1) > 0 THEN
        v_l1_name := 'and paf.l1_name = ANY(' || quote_literal(l1_name) || ')';
    END IF;

    IF l2_name IS NOT NULL AND array_length(l2_name, 1) > 0 THEN
        v_l2_name := 'and paf.l2_name = ANY(' || quote_literal(l2_name) || ')';
    END IF;

    IF l3_name IS NOT NULL AND array_length(l3_name, 1) > 0 THEN
        v_l3_name := 'and paf.l3_name = ANY(' || quote_literal(l3_name) || ')';
    END IF;

    IF end_order_placement_date IS NOT NULL AND start_order_placement_date IS NOT NULL THEN
        v_order_placement_date := 'and oor.order_placement_date between ''' || start_order_placement_date || ''' and ''' || end_order_placement_date || '''';
    END IF;

    IF article IS NOT NULL AND array_length(article, 1) > 0 THEN
        v_article := 'and oor.article = ANY(' || quote_literal(article) || ')';
    END IF;

    IF order_type IS NOT NULL AND array_length(order_type, 1) > 0 THEN
        v_order_type := 'and oor.order_type = ANY(' || quote_literal(order_type) || ')';
    END IF;

    IF order_group_id_list IS NOT NULL AND array_length(order_group_id_list, 1) > 0 THEN
        v_order_group_id_list := 'and oor.order_group_id = ANY(' || quote_literal(order_group_id_list) || ')';
    END IF;

    v_recommended_orders_sql := '
    WITH valid_groups AS (
        SELECT
        oor.order_group_id,
        oor.size,
        COALESCE(ast."order", 999999) AS size_order
        FROM oms.oms_orders_recommended oor
        INNER JOIN global.product_attributes_filter paf
            ON oor.product_code = paf.product_code
        LEFT JOIN (
            SELECT product_code, size, MIN("order") AS "order"
            FROM oms.article_status_tag
            GROUP BY product_code, size
        ) ast
            ON ast.size = oor.size AND ast.product_code = oor.product_code
        WHERE oor.order_status_id = 0
        AND COALESCE(oor.order_quantity_eaches, oor.order_quantity, 0) > 0
            ' || v_l1_name || '
            ' || v_l2_name || '
            ' || v_l3_name || '
            ' || v_order_placement_date || '
            ' || v_article || '
            ' || v_order_type || '
            ' || v_loc_code || '
            ' || v_order_group_id_list || '
        GROUP BY 1, 2, 3
    ),
    base_data AS (
        SELECT
            paf.article::character varying AS article_data,
            max(paf.style_color_desc)::character varying AS style_color_desc,
            max(paf.l1_name) AS l1_name_data,
            max(paf.l2_name) AS l2_name_data,
            max(paf.l3_name) AS l3_name_data,
            max(CASE
                WHEN oor.pack_id IS NULL OR oor.pack_id = ''WP'' THEN oor.size
                ELSE ''-''
            END) AS size_data,
            max(saf.dc_name)::character varying AS loc_code_data,
            max(oor.order_group_id)::text AS order_group_id,
            max(oor.order_group_id)::text AS order_id,
            max(oor.order_placement_date) AS order_placement_date,
            max(oor.editable_expected_receipt_date) AS projected_delivery_date,
            sum(COALESCE(oor.order_quantity_eaches, oor.order_quantity, 0))::integer AS order_quantity,
            max(oor.order_type) AS order_type_data,
            JSON_AGG(
            JSON_BUILD_OBJECT(
                ''loc_code_data'', saf.dc_name,
                ''size_data'', oor.size,
                ''order_quantity'', COALESCE(oor.order_quantity_eaches, oor.order_quantity, 0),
                ''order_placement_date'', oor.order_placement_date,
                ''projected_delivery_date'', oor.editable_expected_receipt_date,
                ''order_group_id'', oor.order_group_id,
                ''order_id'', oor.order_group_id,
                ''order_type_data'', oor.order_type
            )
            ORDER BY size_order
        ) AS status_obj
        FROM oms.oms_orders_recommended oor
        INNER JOIN global.product_attributes_filter paf
            ON oor.product_code = paf.product_code
        INNER JOIN global.store_attributes_filter saf
            ON oor.loc_code = saf.store_code
        INNER JOIN valid_groups vg
            ON oor.order_group_id = vg.order_group_id AND oor.size = vg.size
        GROUP BY paf.article, oor.loc_code, oor.order_placement_date
    )
    SELECT
        bd.*,
        COUNT(*) OVER ()::integer AS total_count,
        SUM(bd.order_quantity) OVER ()::integer AS total_order_qty
    FROM base_data bd
    ' || v_order_clause || '
    ' || v_limit_clause || '
    ';

    RAISE NOTICE 'v_recommended_orders_sql %', v_recommended_orders_sql;

    RETURN QUERY EXECUTE v_recommended_orders_sql;
END;
$function$;
