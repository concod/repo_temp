--liquibase formatted sql
--changeset chandranil.ghosh@impactanalytics.co:get_approval_pane_data_from_order_group_id_list_vs_3 runOnChange:true stripComments:false splitStatements:false context:Release_1_1 labels:MTP-96183
--comment: Added SP for OMS approval pane data from order group id list
--rollback: SELECT 1


DROP FUNCTION IF EXISTS inventory_smart.get_approval_pane_data_from_order_group_id_list(
    order_group_id_list text[],
    collection text[],
    current_assortment_group text[],
    l0_name text[],
    l2_name text[],
    l3_name text[],
    l4_name text[],
    l5_name text[],
    loc_code text[],
    masterstyle_descr text[],
    order_type text[],
    product_group text[],
    product_lifecycle text[],
    subbrand_description text[],
    article text[],
    start_order_placement_date date,
    end_order_placement_date date,
    product_filter jsonb,
    meta_filter jsonb
);

CREATE OR REPLACE FUNCTION inventory_smart.get_approval_pane_data_from_order_group_id_list(
    order_group_id_list text[],
    collection text[],
    current_assortment_group text[],
    l0_name text[],
    l2_name text[],
    l3_name text[],
    l4_name text[],
    l5_name text[],
    loc_code text[],
    masterstyle_descr text[],
    order_type text[],
    product_group text[],
    product_lifecycle text[],
    subbrand_description text[],
    article text[],
    start_order_placement_date date,
    end_order_placement_date date,
    product_filter jsonb,
    meta_filter jsonb
)
 RETURNS TABLE(
    article_data character varying,
    loc_code_data character varying,
    order_placement_date date,
    l0_name_data text,
    l2_name_data text,
    l3_name_data text,
    l4_name_data text,
    l5_name_data text,
    l6_name_data text,
    subbrand_description_data text,
    masterstyle_descr_data text,
    product_lifecycle_data text,
    collection_data text,
    editable_expected_receipt_date date,
    order_quantity integer,
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
    v_order_type text := '';
    v_collection text := '';
    v_current_assortment_group text := '';
    v_l0_name text := '';
    v_l2_name text := '';
    v_l3_name text := '';
    v_l4_name text := '';
    v_l5_name text := '';
    v_loc_code text := '';
    v_masterstyle_descr text := '';
    v_product_group text := '';
    v_product_lifecycle text := '';
    v_subbrand_description text := '';
    v_article text := '';
    v_order_placement_date text := '';
    v_where_clause text := '';
    v_meta_cls text := '';
    v_limit_clause text := '';
    v_order_clause text := '';
    v_size_sort jsonb := NULL;
    v_order_direction text;
BEGIN
    IF meta_filter <> '{}' THEN
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
    -- Apply order clause
    -- IF v_order_clause = '' THEN
    --     v_order_clause := ' ORDER BY size_order ' || v_order_direction;
    -- ELSE
    --     v_order_clause := v_order_clause || ', size_order ' || v_order_direction;
    -- END IF;

    v_pa_sql := inventory_smart.form_main_table_filters('ph_master', product_filter);

    IF order_type IS NOT NULL AND array_length(order_type, 1) > 0 THEN
        v_order_type := 'and oor.order_type = ANY('|| quote_literal(order_type) ||')';
    END IF;

    IF collection IS NOT NULL AND array_length(collection, 1) > 0 THEN
        v_collection := 'and paf.collection = ANY('|| quote_literal(collection) ||')';
    END IF;

    IF current_assortment_group IS NOT NULL AND array_length(current_assortment_group, 1) > 0 THEN
        v_current_assortment_group := 'and paf.current_assortment_group = ANY('|| quote_literal(current_assortment_group) ||')';
    END IF;

    IF l0_name IS NOT NULL AND array_length(l0_name, 1) > 0 THEN
        v_l0_name := 'and paf.l0_name = ANY('|| quote_literal(l0_name) ||')';
    END IF;

    IF l2_name IS NOT NULL AND array_length(l2_name, 1) > 0 THEN
        v_l2_name := 'and paf.l2_name = ANY('|| quote_literal(l2_name) ||')';
    END IF;

    IF l3_name IS NOT NULL AND array_length(l3_name, 1) > 0 THEN
        v_l3_name := 'and paf.l3_name = ANY('|| quote_literal(l3_name) ||')';
    END IF;

    IF l4_name IS NOT NULL AND array_length(l4_name, 1) > 0 THEN
        v_l4_name := 'and paf.l4_name = ANY('|| quote_literal(l4_name) ||')';
    END IF;

    IF l5_name IS NOT NULL AND array_length(l5_name, 1) > 0 THEN
        v_l5_name := 'and paf.l5_name = ANY('|| quote_literal(l5_name) ||')';
    END IF;

    IF loc_code IS NOT NULL AND array_length(loc_code, 1) > 0 THEN
        v_loc_code := 'and oor.loc_code = ANY('|| quote_literal(loc_code) ||')';
    END IF;

    IF masterstyle_descr IS NOT NULL AND array_length(masterstyle_descr, 1) > 0 THEN
        v_masterstyle_descr := 'and paf.masterstyle_descr = ANY('|| quote_literal(masterstyle_descr) ||')';
    END IF;

    IF product_group IS NOT NULL AND array_length(product_group, 1) > 0 THEN
        v_product_group := 'and paf.product_group = ANY('|| quote_literal(product_group) ||')';
    END IF;

    IF product_lifecycle IS NOT NULL AND array_length(product_lifecycle, 1) > 0 THEN
        v_product_lifecycle := 'and paf.product_lifecycle = ANY('|| quote_literal(product_lifecycle) ||')';
    END IF;

    IF subbrand_description IS NOT NULL AND array_length(subbrand_description, 1) > 0 THEN
        v_subbrand_description := 'and paf.subbrand_description = ANY('|| quote_literal(subbrand_description) ||')';
    END IF;

    IF article IS NOT NULL AND array_length(article, 1) > 0 THEN
        v_article := 'and oor.article = ANY('|| quote_literal(article) ||')';
    END IF;

    IF end_order_placement_date IS NOT NULL AND start_order_placement_date IS NOT NULL THEN
        v_order_placement_date := 'and oor.order_placement_date between '''|| start_order_placement_date ||''' and '''|| end_order_placement_date ||'''';
    END IF;

    -- Generate order group id filter dynamically
    IF order_group_id_list IS NOT NULL THEN
        v_order_group_id_filter := 'and oor.order_group_id = ANY(' || quote_literal(order_group_id_list) || ')';
    ELSE
        v_order_group_id_filter := '0=1'; -- No style filter applied if the array is empty
    END IF;

    v_recommended_orders_sql := '
    WITH valid_groups AS MATERIALIZED (
        SELECT oor.order_group_id
        FROM inventory_smart.oms_orders_recommended oor
        WHERE oor.order_status_id = 0
        GROUP BY oor.order_group_id
        HAVING SUM(oor.order_quantity) > 0
    ),
    base_data AS (
        SELECT
            paf.l0_name AS l0_name_data,
            paf.l2_name AS l2_name_data,
            paf.l3_name AS l3_name_data,
            paf.l4_name AS l4_name_data,
            paf.l5_name AS l5_name_data,
            paf.subbrand_description AS subbrand_description_data,
            paf.masterstyle_descr AS masterstyle_descr_data,
            paf.product_lifecycle AS product_lifecycle_data,
            paf.collection AS collection_data,
            paf.l6_name AS l6_name_data,
            oor.article AS article_data,
            oor.loc_code AS loc_code_data,
            oor.order_placement_date,
            oor.order_group_id,
            oor.editable_expected_receipt_date,
            oor.order_type AS order_type_data,
            oor.order_reason,
            oor.order_quantity,
            oor.size,
            COALESCE(ast."order", 999999) AS size_order
        FROM inventory_smart.oms_orders_recommended oor
        JOIN global.product_attributes_filter paf ON oor.product_code = paf.product_code
        JOIN valid_groups vg ON oor.order_group_id = vg.order_group_id
        LEFT JOIN (
            SELECT product_code, size, MIN("order") AS "order"
            FROM inventory_smart.article_status_tag
            GROUP BY product_code, size
        ) ast 
            ON ast.size = oor.size AND ast.product_code = oor.product_code
        WHERE oor.order_status_id = 0
          ' || v_order_type || '
          ' || v_order_placement_date || '
          ' || v_collection || '
          ' || v_l0_name || '
          ' || v_l2_name || '
          ' || v_l3_name || '
          ' || v_l4_name || '
          ' || v_l5_name || '
          ' || v_subbrand_description || '
          ' || v_current_assortment_group || '
          ' || v_masterstyle_descr || '
          ' || v_product_lifecycle || '
          ' || v_loc_code || '
          ' || v_article || '
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
        max(l0_name_data) as l0_name_data,
        max(l2_name_data) as l2_name_data,
        max(l3_name_data) as l3_name_data,
        max(l4_name_data) as l4_name_data,
        max(l5_name_data) as l5_name_data,
        max(l6_name_data) as l6_name_data,
        max(subbrand_description_data) as subbrand_description_data,
        max(masterstyle_descr_data) as masterstyle_descr_data,
        max(product_lifecycle_data) as product_lifecycle_data,
        max(collection_data) as collection_data,
        max(editable_expected_receipt_date) as editable_expected_receipt_date,
        sum(order_quantity)::int as order_quantity,
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
                ''order_reason'',order_reason
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
$function$
;