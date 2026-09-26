--liquibase formatted sql
--changeset chandranil.ghosh@impactanalytics.co:get_approval_pane_data_from_order_group_id_list_briscoes_4 runOnChange:true stripComments:false splitStatements:false context:Release_1_1 labels:MTP-90933
--comment: Updated SP for OMS approval pane data from order group id list to match Briscoes schema.
--rollback: SELECT 1

DROP FUNCTION IF EXISTS inventory_smart.get_approval_pane_data_from_order_group_id_list(
    order_group_id_list text[], l0_name text[], l1_name text[], l2_name text[], l3_name text[], l5_name text[], l6_name text[], loc_code text[], order_type text[], article text[], start_order_placement_date date, end_order_placement_date date, product_filter jsonb, meta_filter jsonb
);

DROP FUNCTION IF EXISTS inventory_smart.get_approval_pane_data_from_order_group_id_list(
    order_group_id_list text[], l0_name text[], l1_name text[], l2_name text[], l3_name text[], l5_name text[], l6_name text[], loc_code text[], order_type text[], article text[], start_order_placement_date text, end_order_placement_date text, product_filter jsonb, meta_filter jsonb
);

CREATE OR REPLACE FUNCTION inventory_smart.get_approval_pane_data_from_order_group_id_list(
    order_group_id_list text[],
    l0_name text[],
    l1_name text[],
    l2_name text[],
    l3_name text[],
    l5_name text[],
    l6_name text[],
    loc_code text[],
    order_type text[],
    article text[],
    start_order_placement_date text,
    end_order_placement_date text,
    product_filter jsonb,
    meta_filter jsonb
)
RETURNS TABLE(
    article_data character varying,
    loc_code_data character varying,
    order_placement_date date,
    editable_expected_receipt_date date,
    order_quantity integer,
    style_name text,
    total_count integer,
    total_order_qty integer,
    status_obj json
)
LANGUAGE plpgsql
AS $function$
DECLARE
    v_pa_sql text := '';
    v_order_group_id_filter text := '';
    v_recommended_orders_sql text := '';
    v_l0_name text := '';
    v_l1_name text := '';
    v_l2_name text := '';
    v_l3_name text := '';
    v_l5_name text := '';
    v_l6_name text := '';
    v_loc_code text := '';
    v_order_type text := '';
    v_article text := '';
    v_order_placement_date text := '';
    v_where_clause text := '';
    v_meta_cls text := '';
    v_limit_clause text := '';
    v_order_clause text := '';
BEGIN
    -- Handle the iso format date(yyyy-mm-dd). ISO date will be received when user input is null
    IF end_order_placement_date ~ '^\d{4}-\d{1,2}-\d{1,2}$' OR  start_order_placement_date ~ '^\d{4}-\d{1,2}-\d{1,2}$' THEN
        -- check if date is in format of yyyy-mm-dd
        start_order_placement_date := '';
        end_order_placement_date := '';
        RAISE NOTICE 'ISO format detected - setting both dates to empty (no date filtering)';
    END IF;
    -- Generate metadata filters if provided
    IF meta_filter <> '{}' THEN
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

    v_pa_sql := inventory_smart.form_main_table_filters('ph_master', product_filter);

    IF l0_name IS NOT NULL AND array_length(l0_name, 1) > 0 THEN
        v_l0_name := 'and paf.l0_name = ANY('|| quote_literal(l0_name) ||')';
    END IF;

    IF l1_name IS NOT NULL AND array_length(l1_name, 1) > 0 THEN
        v_l1_name := 'and paf.l1_name = ANY('|| quote_literal(l1_name) ||')';
    END IF;

    IF l2_name IS NOT NULL AND array_length(l2_name, 1) > 0 THEN
        v_l2_name := 'and paf.l2_name = ANY('|| quote_literal(l2_name) ||')';
    END IF;

    IF l3_name IS NOT NULL AND array_length(l3_name, 1) > 0 THEN
        v_l3_name := 'and paf.l3_name = ANY('|| quote_literal(l3_name) ||')';
    END IF;

    IF l5_name IS NOT NULL AND array_length(l5_name, 1) > 0 THEN
        v_l5_name := 'and paf.l5_name = ANY('|| quote_literal(l5_name) ||')';
    END IF;

    IF l6_name IS NOT NULL AND array_length(l6_name, 1) > 0 THEN
        v_l6_name := 'and paf.l6_name = ANY('|| quote_literal(l6_name) ||')';
    END IF;

    IF loc_code IS NOT NULL AND array_length(loc_code, 1) > 0 THEN
        v_loc_code := 'and oor.loc_code = ANY('|| quote_literal(loc_code) ||')';
    END IF;

    IF order_type IS NOT NULL AND array_length(order_type, 1) > 0 THEN
        v_order_type := 'and oor.order_type = ANY('|| quote_literal(order_type) ||')';
    END IF;

    IF article IS NOT NULL AND array_length(article, 1) > 0 THEN
        v_article := 'and oor.article = ANY('|| quote_literal(article) ||')';
    END IF;

    IF end_order_placement_date IS NOT NULL AND start_order_placement_date IS NOT NULL 
       AND end_order_placement_date <> '' AND start_order_placement_date <> '' THEN
        v_order_placement_date := 'and oor.order_placement_date between TO_DATE(' || 
            quote_literal(start_order_placement_date) || ', ''DD-MM-YYYY'') and TO_DATE(' || 
            quote_literal(end_order_placement_date) || ', ''DD-MM-YYYY'')';
    END IF;

    -- Generate order group id filter dynamically
    IF order_group_id_list IS NOT NULL THEN
        v_order_group_id_filter := 'and oor.order_group_id = ANY(' || quote_literal(order_group_id_list) || ')';
    ELSE
        v_order_group_id_filter := '0=1'; -- No order group id filter applied if the array is empty
    END IF;

    v_recommended_orders_sql := '
    WITH valid_groups AS (
        SELECT oor.order_group_id
        FROM inventory_smart.oms_orders_recommended oor
        WHERE oor.order_status_id = 0
        GROUP BY oor.order_group_id
        HAVING SUM(oor.order_quantity) > 0
    ),
    base_data AS (
        SELECT 
            oor.article AS article_data,
            oor.loc_code AS loc_code_data,
            oor.order_placement_date,
            oor.order_group_id,
            oor.editable_expected_receipt_date,
            oor.order_type AS order_type_data,
            oor.order_quantity,
            oor.size,
            COALESCE(ast."order", 999999) AS size_order,
            paf.style_name
        FROM inventory_smart.oms_orders_recommended oor
        INNER JOIN global.product_attributes_filter paf
            ON oor.product_code = paf.product_code
        INNER JOIN valid_groups vg
            ON oor.order_group_id = vg.order_group_id
        LEFT JOIN (
            SELECT product_code, size, MIN("order") AS "order"
            FROM inventory_smart.article_status_tag
            GROUP BY product_code, size
        ) ast 
            ON ast.size = oor.size AND ast.product_code = oor.product_code
        WHERE oor.order_status_id = 0
            ' || v_l0_name || '
            ' || v_l1_name || '
            ' || v_l2_name || '
            ' || v_l3_name || '
            ' || v_l5_name || '
            ' || v_l6_name || '
            ' || v_order_placement_date || '
            ' || v_article || '
            ' || v_order_type || '
            ' || v_loc_code || '
            ' || v_order_group_id_filter || '
    )

    ,total AS (
    select
    COUNT(*) OVER ()::integer AS total_count,
    SUM(order_quantity)::int AS total_order_qty 
    FROM base_data
	)
	
    SELECT
        article_data,
        loc_code_data,
        order_placement_date,
        max(editable_expected_receipt_date) as editable_expected_receipt_date,
        sum(order_quantity)::int as order_quantity,
        max(style_name) as style_name,
        (SELECT total_count FROM total) AS total_count,
        (SELECT total_order_qty FROM total) AS total_order_qty,
        JSON_AGG(
            JSON_BUILD_OBJECT(
                ''loc_code_data'',loc_code_data,
                ''size'',size,
                ''order_quantity'',order_quantity,
                ''order_placement_date'',order_placement_date,
                ''editable_expected_receipt_date'',editable_expected_receipt_date,
                ''order_group_id'',order_group_id,
                ''order_type_data'',order_type_data
            )
            ORDER BY size_order
        ) AS status_obj
    FROM base_data bd
    group by 1,2,3
    ' || v_order_clause || '
    ' || v_limit_clause || '
    ';

    RAISE NOTICE 'v_recommended_orders_sql %', v_recommended_orders_sql;
    RETURN QUERY EXECUTE v_recommended_orders_sql;
END;
$function$;