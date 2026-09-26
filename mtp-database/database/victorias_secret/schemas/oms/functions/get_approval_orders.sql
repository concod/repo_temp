--liquibase formatted sql
--changeset mssprakash.yashwanth@impactanalytics.co:get_approval_orders_vs_6 runOnChange:true stripComments:false splitStatements:false context:MTP-108671 labels:MTP-108671
--comment: Remove use_adjusted_values parameter from the function

DROP FUNCTION IF EXISTS inventory_smart.get_approval_orders(input refcursor, collection text[], l0_name text[], l2_name text[], l3_name text[], l4_name text[], l5_name text[], loc_code text[], masterstyle_descr text[], product_lifecycle text[], subbrand_description text[], start_order_placement_date date, end_order_placement_date date, product_filter jsonb);
DROP FUNCTION IF EXISTS inventory_smart.get_approval_orders(collection text[], l0_name text[], l2_name text[], l3_name text[], l4_name text[], l5_name text[], loc_code text[], masterstyle_descr text[], product_lifecycle text[], subbrand_description text[], start_order_placement_date date, end_order_placement_date date, product_filter jsonb, meta_filter jsonb);
DROP FUNCTION IF EXISTS inventory_smart.get_approval_orders(_text, _text, _text, _text, _text, _text, _text, _text, _text, _text, _text, _text, _text, _text, date, date, jsonb, jsonb);
-- Above are deprecated functions

DROP FUNCTION IF EXISTS inventory_smart.get_approval_orders(_text, _text, _text, _text, _text, _text, _text, _text, _text, _text, _text, _text, _text, _text, _text, date, date, jsonb, jsonb);
DROP FUNCTION IF EXISTS inventory_smart.get_approval_orders(_text, _text, _text, _text, _text, _text, _text, _text, _text, _text, _text, _text, _text, _text, _text, date, date, jsonb, jsonb, boolean);

CREATE OR REPLACE FUNCTION inventory_smart.get_approval_orders(
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
 l6_id_data text,
 l0_name_data text,
 l2_name_data text,
 l3_name_data text,
 l4_name_data text,
 l5_name_data text,
 l6_name_data text,
 subbrand_code_desc_data text,
 masterstyle_descr_data text,
 collection_data text,
 current_assortment_group_data text,
 flex_style_data text,
 product_lifecycle_data text,
 color_data text,
 generic_data text,
 sizes_mat_data text,
 form_data text,
 user_defined_1_data text,
 user_defined_2_data text,
 user_defined_3_data text,
 user_defined_4_data text,
 user_defined_5_data text,
 user_defined_6_data text,
 editable_expected_receipt_date date,
 order_quantity integer,
 total_count integer,
 total_order_qty integer,
 status_obj json
 )
 
 LANGUAGE plpgsql
AS $function$ 

declare
v_pa_sql text := '';
v_recommended_orders_sql text := '';
v_order_group_id_filter text := '';
v_l0_name text := '';
v_l2_name text := '';
v_l3_name text := '';
v_l4_name text := '';
v_l5_name text := '';
v_subbrand_description text := '';
v_current_assortment_group text := '';
v_collection text := '';
v_masterstyle_descr text := '';
v_product_lifecycle text := '';
v_loc_code text := '';
v_order_placement_date text := '';
v_order_type text := '';
v_article text := '';
v_meta_cls TEXT := ''; 
v_limit_clause TEXT := '';  -- Holds the LIMIT/OFFSET clause
v_order_clause TEXT := '';
v_having_clause TEXT := '';
v_where_clause TEXT := '';
v_size_sort jsonb := NULL;
v_order_direction text := 'ASC';

BEGIN 

 -- Generate metadata filters if provided
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

    -- Build WHERE and LIMIT clauses from meta_filter
    v_meta_cls := global.form_table_query(meta_filter);

    -- Extract the WHERE clause (if present)
    IF v_meta_cls ~* 'WHERE' THEN
        v_where_clause := substring(v_meta_cls FROM 'WHERE\s.*?(?=\sLIMIT|\sOFFSET|$)');
    END IF;

    -- Extract the LIMIT/OFFSET clause (if present)
    IF v_meta_cls ~* 'LIMIT' THEN
        v_limit_clause := substring(v_meta_cls FROM 'LIMIT\s.*$');
    END IF;

    -- Extract the ORDER clause (if present)
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

v_pa_sql := global.form_main_table_filters('product_attributes_filter', product_filter);

IF l0_name IS NOT NULL AND array_length(l0_name, 1) > 0 THEN
	v_l0_name := 'and paf.l0_name = ANY('|| quote_literal(l0_name) ||')';
end if;

if l2_name IS NOT NULL AND array_length(l2_name, 1) > 0 THEN
	v_l2_name := 'and paf.l2_name = ANY('|| quote_literal(l2_name) ||')';
end if;

if l3_name IS NOT NULL AND array_length(l3_name, 1) > 0 THEN
	v_l3_name := 'and paf.l3_name = ANY('|| quote_literal(l3_name) ||')';
end if;

if l4_name IS NOT NULL AND array_length(l4_name, 1) > 0 THEN
	v_l4_name := 'and paf.l4_name = ANY('|| quote_literal(l4_name) ||')';
end if;

if l5_name IS NOT NULL AND array_length(l5_name, 1) > 0 THEN
	v_l5_name := 'and paf.l5_name = ANY('|| quote_literal(l5_name) ||')';
end if;

if subbrand_description IS NOT NULL AND array_length(subbrand_description, 1) > 0 THEN
	v_subbrand_description := 'and paf.subbrand_description = ANY('|| quote_literal(subbrand_description) ||')';
end if;

if collection IS NOT NULL AND array_length(collection, 1) > 0 THEN
	v_collection := 'and paf.collection = ANY('|| quote_literal(collection) ||')';
end if;

if masterstyle_descr IS NOT NULL AND array_length(masterstyle_descr, 1) > 0 THEN
	v_masterstyle_descr := 'and paf.masterstyle_descr = ANY('|| quote_literal(masterstyle_descr) ||')';
end if;

if product_lifecycle IS NOT NULL AND array_length(product_lifecycle, 1) > 0 THEN
	v_product_lifecycle := 'and paf.product_lifecycle = ANY('|| quote_literal(product_lifecycle) ||')';
end if;

if current_assortment_group IS NOT NULL AND array_length(current_assortment_group, 1) > 0 THEN
	v_current_assortment_group := 'and paf.current_assortment_group = ANY('|| quote_literal(current_assortment_group) ||')';
end if;

if loc_code IS NOT NULL AND array_length(loc_code, 1) > 0 THEN
	v_loc_code := 'and oor.loc_code = ANY('|| quote_literal(loc_code) ||')';
end if;

if article IS NOT NULL AND array_length(article, 1) > 0 THEN
	v_article := 'and oor.article = ANY('|| quote_literal(article) ||')';
end if;

if end_order_placement_date is not null and start_order_placement_date is not null then
	v_order_placement_date := 'and oor.order_placement_date between '''|| start_order_placement_date ||''' and '''|| end_order_placement_date ||'''';
end if;

if order_type IS NOT NULL AND array_length(order_type, 1) > 0 THEN
	v_order_type := 'and oor.order_type = ANY('|| quote_literal(order_type) ||')';
end if;

-- HAVING clause

v_having_clause := 'HAVING SUM(order_quantity) > 0';

-- Generate order group id filter dynamically
IF order_group_id_list IS NOT NULL AND array_length(order_group_id_list, 1) > 0 THEN
    v_order_group_id_filter := 'and oor.order_group_id = ANY(' || quote_literal(order_group_id_list) || ')';
END IF;

v_recommended_orders_sql := '    
    WITH base_data AS (
        SELECT
            oor.order_placement_recom_date,
            paf.l6_id,
            paf.l0_name,
            paf.l2_name,
            paf.l6_name,
            paf.l3_name,
            paf.l4_name,
            paf.masterstyle_descr,
            paf.l5_name,
            paf.color,
            paf.subbrand_code_desc,
            paf.collection,
            paf.current_assortment_group,
            paf.product_lifecycle,
            paf.flex_style,
            paf.generic,
            paf.sizes_mat,
            paf.form,
            paf.user_defined_1,
            paf.user_defined_2,
            paf.user_defined_3,
            paf.user_defined_4,
            paf.user_defined_5,
            paf.user_defined_6,
            oor.article AS article_data,
            oor.loc_code AS loc_code_data,
            oor.order_placement_date,
            oor.order_group_id,
            oor.editable_expected_receipt_date AS editable_expected_receipt_date,
            oor.order_type AS order_type_data,
            oor.order_reason,
            oor.order_quantity AS order_quantity,
            oor.size,
            COALESCE(ast."order", 999999) AS size_order
        FROM inventory_smart.oms_orders_recommended oor
        JOIN global.product_attributes_filter paf ON oor.product_code = paf.product_code        
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
    SUM(order_quantity)::int AS total_order_qty 
    FROM base_data
	)
	
    SELECT
        article_data,
        loc_code_data,
        order_placement_date,
        max(l6_id) as l6_id_data,
        max(l0_name) as l0_name_data,
        max(l2_name) as l2_name_data,
        max(l3_name) as l3_name_data,
        max(l4_name) as l4_name_data,
        max(l5_name) as l5_name_data,
        max(l6_name) as l6_name_data,
        max(subbrand_code_desc) as subbrand_code_desc_data,
        max(masterstyle_descr) as masterstyle_descr_data,
        max(collection) as collection_data,
        max(current_assortment_group) as current_assortment_group_data,
        max(flex_style) as flex_style_data,
        max(product_lifecycle) as product_lifecycle_data,
        max(color) as color_data,
        max(generic) as generic_data,
        max(sizes_mat) as sizes_mat_data,
        max(form) as form_data,
        max(user_defined_1) as user_defined_1_data,
        max(user_defined_2) as user_defined_2_data,
        max(user_defined_3) as user_defined_3_data,
        max(user_defined_4) as user_defined_4_data,
        max(user_defined_5) as user_defined_5_data,
        max(user_defined_6) as user_defined_6_data,
        max(editable_expected_receipt_date) as editable_expected_receipt_date,
        sum(order_quantity)::int as order_quantity,
        COUNT(*) OVER ()::integer AS total_count,
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
                ''order_reason'',order_reason,
                ''order_placement_recom_date'', order_placement_recom_date
            )
            ORDER BY size_order
        ) AS status_obj
    FROM base_data bd
    group by 1,2,3
    ' || v_having_clause || '
    ' || v_order_clause || '
    ' || v_limit_clause || ';
    ';

    RAISE NOTICE 'v_recommended_orders_sql %', v_recommended_orders_sql;

    RETURN QUERY EXECUTE v_recommended_orders_sql;

END
$function$;
