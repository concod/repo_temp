--liquibase formatted sql
--changeset chandranil.ghosh@impactanalytics.co:get_approval_pane_data_from_order_group_id_list_spanx_2 runOnChange:true stripComments:false splitStatements:false context:MTP-55924 labels:MTP-90933_0.
--comment: Updated SP for OMS approval pane data from order group id list to match Spanx schema
--rollback: SELECT 1

DROP FUNCTION IF EXISTS inventory_smart.get_approval_pane_data_from_order_group_id_list(
    order_group_id_list text[],
    article text[],
    l1_name text[],
    l3_name text[],
    l4_name text[],
    loc_code text[],
    order_type text[],
    start_order_placement_date date,
    end_order_placement_date date,
    product_filter jsonb,
    meta_filter jsonb
);

CREATE OR REPLACE FUNCTION inventory_smart.get_approval_pane_data_from_order_group_id_list(
    order_group_id_list text[],
    article text[],
    l1_name text[],
    l3_name text[],
    l4_name text[],
    loc_code text[],
    order_type text[],
    start_order_placement_date date,
    end_order_placement_date date,
    product_filter jsonb,
    meta_filter jsonb
)
RETURNS TABLE(
    article_data character varying,
    loc_code_data character varying,
    order_placement_date date,
    editable_expected_receipt_date date,
    order_quantity integer,
    label_code text,
    dimension_pack text,
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
    v_l1_name text := '';
    v_l3_name text := '';
    v_l4_name text := '';
    v_article text := '';
    v_loc_code text := '';
    v_order_type text := '';
    v_order_placement_date text := '';
    v_where_clause text := '';
    v_meta_cls text := '';
    v_limit_clause text := '';
    v_order_clause text := '';
    v_size_sort jsonb := NULL;
    v_order_direction text;
BEGIN
    IF meta_filter IS NOT NULL AND jsonb_typeof(meta_filter) = 'object' AND meta_filter <> '{}'::jsonb THEN
        -- Check if size is in sort array and remove it
        IF meta_filter->'sort' IS NOT NULL AND jsonb_array_length(meta_filter->'sort') > 0 THEN
            FOR i IN 0..jsonb_array_length(meta_filter->'sort')-1 LOOP
                IF (meta_filter->'sort'->i->>'column') = 'size' THEN
                    v_size_sort := meta_filter->'sort'->i;
                    -- Remove size from sort array
                    meta_filter := jsonb_set(
                        meta_filter,
                        '{sort}',
                        (meta_filter->'sort') - i
                    );
                    EXIT;
                END IF;
            END LOOP;
        END IF;

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

    -- Handle size sorting
    IF v_size_sort IS NOT NULL AND v_size_sort->>'order' = 'desc' THEN
        v_order_direction := 'DESC';
    ELSE
        v_order_direction := 'ASC';
    END IF;
    -- IF v_order_clause = '' THEN
    --     v_order_clause := ' ORDER BY bd.size_order ' || v_order_direction;
    -- ELSE
    --     v_order_clause := v_order_clause || ', bd.size_order ' || v_order_direction;
    -- END IF;

    v_pa_sql := inventory_smart.form_main_table_filters('ph_master', product_filter);

    IF l1_name IS NOT NULL AND array_length(l1_name, 1) > 0 THEN
        v_l1_name := 'AND paf.l1_name = ANY(' || quote_literal(l1_name) || ')';
    END IF;
    IF l3_name IS NOT NULL AND array_length(l3_name, 1) > 0 THEN
        v_l3_name := 'AND paf.l3_name = ANY(' || quote_literal(l3_name) || ')';
    END IF;
    IF l4_name IS NOT NULL AND array_length(l4_name, 1) > 0 THEN
        v_l4_name := 'AND paf.l4_name = ANY(' || quote_literal(l4_name) || ')';
    END IF;
    IF article IS NOT NULL AND array_length(article, 1) > 0 THEN
        v_article := 'AND paf.article = ANY(' || quote_literal(article) || ')';
    END IF;
    IF loc_code IS NOT NULL AND array_length(loc_code, 1) > 0 THEN
        v_loc_code := 'AND oor.loc_code = ANY(' || quote_literal(loc_code) || ')';
    END IF;
    IF order_type IS NOT NULL AND array_length(order_type, 1) > 0 THEN
        v_order_type := 'AND oor.order_type = ANY(' || quote_literal(order_type) || ')';
    END IF;
    IF end_order_placement_date IS NOT NULL AND start_order_placement_date IS NOT NULL THEN
        v_order_placement_date := 'AND oor.order_placement_date BETWEEN ''' || start_order_placement_date || ''' AND ''' || end_order_placement_date || '''';
    END IF;
    IF order_group_id_list IS NOT NULL THEN
        v_order_group_id_filter := 'AND oor.order_group_id = ANY(' || quote_literal(order_group_id_list) || ')';
    ELSE
        v_order_group_id_filter := '0=1';
    END IF;

    v_recommended_orders_sql := '
        WITH valid_groups AS MATERIALIZED (
            SELECT order_group_id
            FROM inventory_smart.oms_orders_recommended
            WHERE order_status_id = 0
            GROUP BY order_group_id
            HAVING SUM(order_quantity) > 0
        ),
        base_data AS (
            SELECT 
                paf.article AS article_data,
                paf.size,
                paf.label_code,
                paf.dimension_pack,
                oor.loc_code AS loc_code_data,
                oor.order_placement_date,
                oor.editable_expected_receipt_date,
                oor.order_type AS order_type_data,
                oor.order_group_id,
                oor.order_quantity,
                ast."order" as size_order
            FROM inventory_smart.oms_orders_recommended oor
            INNER JOIN (
                SELECT *
                FROM global.product_attributes_filter paf
            ) paf ON oor.product_code = paf.product_code
            INNER JOIN valid_groups vg ON oor.order_group_id = vg.order_group_id
            INNER JOIN inventory_smart.article_status_tag ast ON ast.size = paf.size AND ast.product_code = paf.product_code
            WHERE oor.order_status_id = 0
                ' || v_l1_name || '
                ' || v_l3_name || '
                ' || v_l4_name || '
                ' || v_article || '
                ' || v_loc_code || '
                ' || v_order_type || '
                ' || v_order_placement_date || '
                '|| v_order_group_id_filter ||'
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
        max(order_placement_date) as order_placement_date,
        max(editable_expected_receipt_date) as editable_expected_receipt_date,
        sum(order_quantity)::int as order_quantity,
        max(label_code) as label_code,
        max(dimension_pack) as dimension_pack,
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
                ''order_type_data'',order_type_data,
                ''label_code'',label_code,
                ''dimension_pack'',dimension_pack
            )
            ORDER BY size_order
        ) AS status_obj
    FROM base_data bd
    group by 1,2
        ' || v_order_clause || '
        ' || v_limit_clause || '
    ';

    RAISE NOTICE 'v_recommended_orders_sql %', v_recommended_orders_sql;
    RETURN QUERY EXECUTE v_recommended_orders_sql;
END;
$function$;