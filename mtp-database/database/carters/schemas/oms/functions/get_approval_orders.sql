--liquibase formatted sql
--changeset piyush.raj@impactanalytics.co:get_approval_orders_add_order_group_id_list_2 runOnChange:true stripComments:false splitStatements:false context:MTP-121449 labels:get_approval_orders_carters_12
--comment: Added having clause.
--rollback: SELECT 1

DROP FUNCTION IF EXISTS inventory_smart.get_approval_orders(
    input refcursor,
    class text[],
    collection text[],
    l1_name text[],
    order_type text[],
    season text[],
    style text[],
    style_description text[],
    subclass text[],
    start_order_placement_date date,
    end_order_placement_date date,
    product_filter jsonb
);

DROP FUNCTION IF EXISTS inventory_smart.get_approval_orders(
    order_group_id_list text[],
    class text[],
    collection text[], 
    l1_name text[],
    order_type text[],
    season text[],
    style text[],
    style_description text[],
    subclass text[],
    start_order_placement_date date,
    end_order_placement_date date,
    product_filter jsonb,
    meta_filter jsonb
);

CREATE OR REPLACE FUNCTION inventory_smart.get_approval_orders(
    order_group_id_list text[],
    class text[],
    collection text[],
    l1_name text[],
    order_type text[],
    season text[],
    style text[],
    style_description text[],
    subclass text[],
    start_order_placement_date date,
    end_order_placement_date date,
    product_filter jsonb,
    meta_filter jsonb
)
RETURNS TABLE(
    style_data varchar,
    channel varchar,
    order_placement_date date,
    order_group_id varchar,
    order_type_data varchar,
    editable_expected_receipt_date date,
    order_quantity integer,
    season_data text,
    style_description_data text,
    total_count integer,
    total_order_qty integer,
    status_obj json
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_pa_sql text := '';
    v_order_group_id_filter text := '';
    v_recommended_orders_sql text := '';
    v_order_type text := '';
    v_collection text := '';
    v_class text := '';
    v_season text := '';
    v_subclass text := '';
    v_style text := '';
    v_style_description text := '';
    v_l1_name text := '';
    v_order_placement_date text := '';
    v_where_clause text := '';
    v_meta_cls text := '';
    v_limit_clause text := '';
    v_order_clause text := '';
    v_having_clause TEXT := '';
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

    IF class IS NOT NULL AND array_length(class, 1) > 0 THEN
        v_class := 'and paf.class = ANY('|| quote_literal(class) ||')';
    END IF;

    IF season IS NOT NULL AND array_length(season, 1) > 0 THEN
        v_season := 'and paf.season = ANY('|| quote_literal(season) ||')';
    END IF;

    IF subclass IS NOT NULL AND array_length(subclass, 1) > 0 THEN
        v_subclass := 'and paf.subclass = ANY('|| quote_literal(subclass) ||')';
    END IF;

    IF style IS NOT NULL AND array_length(style, 1) > 0 THEN
        v_style := 'and paf.style = ANY('|| quote_literal(style) ||')';
    END IF;

    IF style_description IS NOT NULL AND array_length(style_description, 1) > 0 THEN
        v_style_description := 'and paf.style_description = ANY('|| quote_literal(style_description) ||')';
    END IF;

    IF l1_name IS NOT NULL AND array_length(l1_name, 1) > 0 THEN
        v_l1_name := 'and paf.l1_name = ANY('|| quote_literal(l1_name) ||')';
    END IF;

    IF end_order_placement_date IS NOT NULL AND start_order_placement_date IS NOT NULL THEN
        v_order_placement_date := 'and oor.order_placement_date between '''|| start_order_placement_date ||''' and '''|| end_order_placement_date ||'''';
    END IF;

    -- Generate order group id filter dynamically
    IF order_group_id_list IS NOT NULL AND array_length(order_group_id_list, 1) > 0 THEN
        v_order_group_id_filter := 'and oor.order_group_id = ANY(' || quote_literal(order_group_id_list) || ')'; -- No style filter applied if the array is empty
    END IF;

    -- HAVING clause

    v_having_clause := 'HAVING SUM(order_quantity) > 0';

    v_recommended_orders_sql := '
     WITH base_data AS (
        SELECT
            oor.order_placement_recom_date,
            oor.style AS style_data,
            oor.channel,
            oor.size,
            oor.order_placement_date,
            oor.order_group_id,
            oor.editable_expected_receipt_date,
            oor.order_type AS order_type_data,
            oor.order_quantity,
            paf.season AS season_data,
            paf.style_description AS style_description_data,
            ast."order" as size_order
        FROM inventory_smart.oms_orders_recommended oor
        JOIN "global".product_attributes_filter paf ON oor.product_code = paf.product_code
        JOIN inventory_smart.article_status_tag ast ON ast.size = paf.size AND ast.product_code = paf.product_code
        WHERE oor.order_status_id = 0
        ' || v_order_type || '
        ' || v_order_placement_date || '
        ' || v_collection || '
        ' || v_class || '
        ' || v_season || '
        ' || v_subclass || '
        ' || v_style || '
        ' || v_style_description || '
        ' || v_l1_name || '
        '|| v_order_group_id_filter ||'
    )

    ,total AS (
    select
    SUM(order_quantity)::int AS total_order_qty 
    FROM base_data
    )
    
    SELECT
        style_data,
        channel,
        order_placement_date,
        order_group_id,
        order_type_data,
        max(editable_expected_receipt_date) as editable_expected_receipt_date,
        sum(order_quantity)::int as order_quantity,
        max(season_data) as season_data,
        max(style_description_data) as style_description_data,
        COUNT(*) OVER ()::integer AS total_count,
        (SELECT total_order_qty FROM total) AS total_order_qty,
        JSON_AGG(
            JSON_BUILD_OBJECT(
                ''channel'',channel,
                ''size'',size,
                ''order_quantity'',order_quantity,
                ''order_placement_date'',order_placement_date,
                ''order_placement_recom_date'', order_placement_recom_date,
                ''editable_expected_receipt_date'',editable_expected_receipt_date,
                ''order_group_id'',order_group_id,
                ''order_type_data'',order_type_data
            )
            ORDER BY size_order
        ) AS status_obj
    FROM base_data bd
    group by 1,2,3,4,5
    ' || v_having_clause || '
    ' || v_order_clause || '
    ' || v_limit_clause || ';
    ';
RAISE NOTICE 'v_recommended_orders_sql %', v_recommended_orders_sql;
RETURN QUERY EXECUTE v_recommended_orders_sql;
END;
$$;
