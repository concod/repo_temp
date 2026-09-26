--liquibase formatted sql
--changeset chandranil.ghosh@impactanalytics.co:get_approval_orders_add_order_group_id_list_3 runOnChange:true stripComments:false splitStatements:false context:MTP-98962 labels:get_approval_orders_vs_8
--comment: added having clause.
--rollback: SELECT 1
DROP FUNCTION IF EXISTS inventory_smart.get_approval_orders(input refcursor, collection text[], l0_name text[], l2_name text[], l3_name text[], l4_name text[], l5_name text[], loc_code text[], masterstyle_descr text[], product_lifecycle text[], subbrand_description text[], start_order_placement_date date, end_order_placement_date date, product_filter jsonb);
DROP FUNCTION IF EXISTS inventory_smart.get_approval_orders(collection text[], l0_name text[], l2_name text[], l3_name text[], l4_name text[], l5_name text[], loc_code text[], masterstyle_descr text[], product_lifecycle text[], subbrand_description text[], start_order_placement_date date, end_order_placement_date date, product_filter jsonb, meta_filter jsonb);
DROP FUNCTION IF EXISTS inventory_smart.get_approval_orders(_text, _text, _text, _text, _text, _text, _text, _text, _text, _text, _text, _text, _text, _text, date, date, jsonb, jsonb);
-- Above are deprecated functions

DROP FUNCTION IF EXISTS inventory_smart.get_approval_orders(_text, _text, _text, _text, _text, _text, _text, _text, _text, _text, _text, _text, _text, _text, _text, date, date, jsonb, jsonb);

DROP FUNCTION IF EXISTS inventory_smart.get_approval_orders(_text, _text, _text, _text, _text, _text, _text, _text,date,date,jsonb,jsonb);

CREATE OR REPLACE FUNCTION inventory_smart.get_approval_orders(article text[], order_group_id_list text[], l2_name text[], l3_name text[], style_name text[], color_id text[], loc_code text[], order_type text[], start_order_placement_date date, end_order_placement_date date, product_filter jsonb, meta_filter jsonb)
 RETURNS TABLE(article_data character varying, loc_code_data character varying, order_placement_date date, l0_name_data text, l1_name_data text, l2_name_data text, l3_name_data text, style_name_data text,  editable_expected_receipt_date date, order_quantity integer, total_count integer, total_order_qty integer, status_obj json)
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
v_old text := '';
v_new text := '';

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

        v_where_clause := regexp_replace(v_where_clause, '^\s*WHERE\s+', 'AND ', 'i');

        FOR v_old, v_new IN 
            SELECT * FROM (VALUES
                ('style_name_data', 'paf.style_name'),
                ('article_data', 'oor.article'),
                ('loc_code_data', 'oor.loc_code'),
                ('order_group_id', 'oor.order_group_id'),
                ('order_type_data', 'oor.order_type'),
                ('size', 'oor.size')
            ) AS mapping(v_old, v_new)
        LOOP
            v_where_clause := regexp_replace(v_where_clause, v_old, v_new, 'gi');
        END LOOP;

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

v_pa_sql := inventory_smart.form_main_table_filters('ph_master', product_filter);



if l2_name IS NOT NULL AND array_length(l2_name, 1) > 0 THEN
	v_l2_name := 'and paf.l2_name = ANY('|| quote_literal(l2_name) ||')';
end if;

if l3_name IS NOT NULL AND array_length(l3_name, 1) > 0 THEN
	v_l3_name := 'and paf.l3_name = ANY('|| quote_literal(l3_name) ||')';
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
            paf.l0_name AS l0_name_data,
            paf.l1_name AS l1_name_data,
            paf.l2_name AS l2_name_data,
            paf.l3_name AS l3_name_data,
            oor.article AS article_data,
			paf.style_name AS style_name_data,
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
          ' || v_subbrand_description || '
          ' || v_current_assortment_group || '
          ' || v_masterstyle_descr || '
          ' || v_product_lifecycle || '
          ' || v_loc_code || '
          ' || v_article || '
          ' || v_order_group_id_filter || '
		  ' || v_where_clause ||'
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
        max(l0_name_data) as l0_name_data,
        max(l1_name_data) as l1_name_data,
        max(l2_name_data) as l2_name_data,
        max(l3_name_data) as l3_name_data,
		max(style_name_data) as style_name_data,
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
$function$
;