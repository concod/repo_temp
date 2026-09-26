--liquibase formatted sql
--changeset chandranil.ghosh:approval_pane_lovisa_update_v18_where_orderby_overlap runOnChange:true stripComments:false splitStatements:false context:MTP-123430_2 labels:MTP-137854_1
--comment: Stop WHERE-clause regex at ORDER BY so v_where_clause does not duplicate the ORDER BY into the final SQL
--rollback: SELECT 1
DROP FUNCTION IF EXISTS inventory_smart.get_approval_orders(l1_name text[], l2_name text[], l3_name text[], range_usa text[], range_eu_uk text[], range_au_nz text[], range_asia text[], range_africa text[], l4_name text[], style_name text[], loc_code text[], order_type text[], name text[], start_order_placement_date text, end_order_placement_date text, product_filter jsonb, order_group_id_list text[], meta_filter jsonb);
DROP FUNCTION IF EXISTS inventory_smart.get_approval_orders(l1_name text[], l2_name text[], l3_name text[], range_usa text[], range_eu_uk text[], range_au_nz text[], range_asia text[], range_africa text[], l4_name text[], style_name text[], order_type text[], dc_name text[], start_order_placement_date text, end_order_placement_date text, product_filter jsonb, order_group_id_list text[], meta_filter jsonb);

CREATE OR REPLACE FUNCTION inventory_smart.get_approval_orders(
    l1_name text[],
    l2_name text[],
    l3_name text[],
    range_usa text[],
    range_eu_uk text[],
    range_au_nz text[],
    range_asia text[],
    range_africa text[],
    l4_name text[],
    style_name text[],
    --loc_code text[],
    order_type text[],
    dc_name text[],
    start_order_placement_date text,
    end_order_placement_date text,
    product_filter jsonb,
    order_group_id_list text[],
    meta_filter jsonb
    )
 RETURNS TABLE(
    loc_code_data character varying,
    order_placement_date date,
    l1_name_data character varying,
    l2_name_data character varying,
    l3_name_data character varying,
    l4_name_data character varying,
    style_name_data character varying,
    range_usa_data character varying,
    range_eu_uk_data character varying,
    range_au_nz_data character varying,
    range_asia_data character varying,
    range_africa_data character varying, 
    editable_expected_receipt_date date,
    order_quantity integer,
    total_count integer,
    total_order_qty integer,
    ship_mode character varying,
    status_obj json,
    name character varying)
 LANGUAGE plpgsql
AS $function$ 

declare
v_recommended_orders_sql text := '';


-- Filter variables
v_l1_name text := '';
v_l2_name text := '';
v_l3_name text := '';
v_l4_name text := '';
v_l5_name text := '';
v_current_assortment_group text := '';
v_loc_code text := '';
v_merged_loc text[] := ARRAY[]::text[];
v_resolved_from_dc_name text[] := ARRAY[]::text[];
v_filter_dc_names text[];
v_order_placement_date text := '';
v_order_type text := '';
v_order_group_id_filter text := '';
v_range_usa text := '';
v_range_eu_uk text := '';
v_range_au_nz text := '';
v_range_asia text := '';
v_range_africa text := '';
v_style_name text := '';
v_paf_filters text := '';
v_meta_cls TEXT := ''; 
v_limit_clause TEXT := '';  -- Holds the LIMIT/OFFSET clause
v_order_clause TEXT := '';
v_having_clause TEXT := '';
v_where_clause TEXT := '';
v_size_sort jsonb := NULL;
v_order_direction text := 'ASC';
v_product_filter jsonb := '{}'::jsonb;
v_meta_filter    jsonb := '{}'::jsonb;

BEGIN 

-- Copy param "name" so SQL like dc.name = ANY(...) does not confuse "name" with dc.name
    v_filter_dc_names := dc_name;

-- Set the filter variables
    v_product_filter := product_filter;
    v_meta_filter := meta_filter;

    if v_meta_filter <> '{}' THEN
        v_meta_filter := regexp_replace( v_meta_filter::text, '"column"\s*:\s*"name"', '"column":"centre_name"','g')::jsonb;
    END IF;
 -- Generate metadata filters if provided
   IF v_meta_filter IS NOT NULL AND jsonb_typeof(v_meta_filter) = 'object' AND v_meta_filter <> '{}'::jsonb THEN
    -- Check if size is in sort array and remove it
    IF v_meta_filter->'sort' IS NOT NULL AND jsonb_array_length(v_meta_filter->'sort') > 0 THEN
        FOR i IN 0..jsonb_array_length(v_meta_filter->'sort')-1 LOOP
            IF (v_meta_filter->'sort'->i->>'column') = 'size' THEN
                v_size_sort := v_meta_filter->'sort'->i;
                -- Remove size from sort array
                v_meta_filter := jsonb_set(
                    v_meta_filter,
                    '{sort}',
                    (v_meta_filter->'sort') - i
                );
                EXIT;
            END IF;
        END LOOP;
    END IF;

    -- Build WHERE and LIMIT clauses from meta_filter
    v_meta_cls := global.form_table_query(v_meta_filter);

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

IF l1_name IS NOT NULL AND array_length(l1_name, 1) > 0 THEN
	v_l1_name := 'and paf.l1_name = ANY('|| quote_literal(l1_name) ||')';
    v_paf_filters := v_paf_filters || ' and l1_name = ANY('|| quote_literal(l1_name) ||')';
end if;

if l2_name IS NOT NULL AND array_length(l2_name, 1) > 0 THEN
	v_l2_name := 'and paf.l2_name = ANY('|| quote_literal(l2_name) ||')';
    v_paf_filters := v_paf_filters || ' and l2_name = ANY('|| quote_literal(l2_name) ||')';
end if;

if l3_name IS NOT NULL AND array_length(l3_name, 1) > 0 THEN
	v_l3_name := 'and paf.l3_name = ANY('|| quote_literal(l3_name) ||')';
    v_paf_filters := v_paf_filters || ' and l3_name = ANY('|| quote_literal(l3_name) ||')';
end if;

if l4_name IS NOT NULL AND array_length(l4_name, 1) > 0 THEN
	v_l4_name := 'and paf.l4_name = ANY('|| quote_literal(l4_name) ||')';
    v_paf_filters := v_paf_filters || ' and l4_name = ANY('|| quote_literal(l4_name) ||')';
end if;

IF style_name IS NOT NULL AND array_length(style_name, 1) > 0 THEN
    v_style_name := 'and paf.style_name = ANY('|| quote_literal(style_name) ||')';
    v_paf_filters := v_paf_filters || ' and style_name = ANY('|| quote_literal(style_name) ||')';
END IF;

IF range_usa IS NOT NULL AND array_length(range_usa, 1) > 0 THEN
    v_range_usa := 'and paf.range_usa = ANY('|| quote_literal(range_usa) ||')';
    v_paf_filters := v_paf_filters || ' and range_usa = ANY('|| quote_literal(range_usa) ||')';
END IF;

IF range_eu_uk IS NOT NULL AND array_length(range_eu_uk, 1) > 0 THEN
    v_range_eu_uk := 'and paf.range_eu_uk = ANY('|| quote_literal(range_eu_uk) ||')';
    v_paf_filters := v_paf_filters || ' and range_eu_uk = ANY('|| quote_literal(range_eu_uk) ||')';
END IF;

IF range_au_nz IS NOT NULL AND array_length(range_au_nz, 1) > 0 THEN
    v_range_au_nz := 'and paf.range_au_nz = ANY('|| quote_literal(range_au_nz) ||')';
    v_paf_filters := v_paf_filters || ' and range_au_nz = ANY('|| quote_literal(range_au_nz) ||')';
END IF;

IF range_asia IS NOT NULL AND array_length(range_asia, 1) > 0 THEN
    v_range_asia := 'and paf.range_asia = ANY('|| quote_literal(range_asia) ||')';
    v_paf_filters := v_paf_filters || ' and range_asia = ANY('|| quote_literal(range_asia) ||')';
END IF;

IF range_africa IS NOT NULL AND array_length(range_africa, 1) > 0 THEN
    v_range_africa := 'and paf.range_africa = ANY('|| quote_literal(range_africa) ||')';
    v_paf_filters := v_paf_filters || ' and range_africa = ANY('|| quote_literal(range_africa) ||')';
END IF;

-- if loc_code IS NOT NULL AND array_length(loc_code, 1) > 0 THEN
-- 	v_loc_code := 'and oor.loc_code = ANY('|| quote_literal(loc_code) ||')';
-- end if;

-- article parameter removed - no longer needed
   IF end_order_placement_date IS NOT NULL AND start_order_placement_date IS NOT NULL 
       AND end_order_placement_date <> '' AND start_order_placement_date <> '' THEN
        v_order_placement_date := 'and oor.order_placement_date between TO_DATE(' || 
            quote_literal(start_order_placement_date) || ', ''DD-MM-YYYY'') and TO_DATE(' || 
            quote_literal(end_order_placement_date) || ', ''DD-MM-YYYY'')';
    END IF;

if order_type IS NOT NULL AND array_length(order_type, 1) > 0 THEN
	v_order_type := 'and oor.order_type = ANY('|| quote_literal(order_type) ||')';
end if;

if order_group_id_list IS NOT NULL AND array_length(order_group_id_list, 1) > 0 THEN
	v_order_group_id_filter := 'and oor.order_group_id = ANY('|| quote_literal(order_group_id_list) ||')';
end if;

-- HAVING clause

v_having_clause := 'HAVING SUM(order_quantity) > 0';


v_recommended_orders_sql := '
    WITH paf_prefilter AS (
        SELECT DISTINCT ON (l4_name)
            l1_name,
            l2_name,
            l3_name,
            l4_name,
            range_usa,
            range_eu_uk,
            range_au_nz,
            range_asia,
            range_africa,
            style_name,
            product_code
        FROM global.product_attributes_filter
        WHERE 1 = 1
          ' || v_paf_filters || '
        ORDER BY l4_name
    ),
    filtered_orders AS (
        SELECT *
        FROM inventory_smart.oms_orders_recommended oor
        WHERE oor.order_status_id = 0
          ' || v_order_type || '
          ' || v_order_placement_date || '
          ' || v_loc_code || '
          ' || v_order_group_id_filter || '
    ),
    ast_prefilter AS (
        SELECT product_code, size, MIN("order") AS "order"
        FROM inventory_smart.article_status_tag
        WHERE product_code IN (SELECT product_code FROM paf_prefilter)
        GROUP BY product_code, size
    ),
    base_data AS (
        SELECT
            oor.order_placement_recom_date,
            oor.loc_code AS loc_code_data,
            paf.l1_name AS l1_name_data,
            paf.l2_name AS l2_name_data,
            paf.l3_name AS l3_name_data,
            paf.l4_name AS l4_name_data,
            paf.range_usa AS range_usa_data,
            paf.range_eu_uk AS range_eu_uk_data,
            paf.range_au_nz AS range_au_nz_data,
            paf.range_asia AS range_asia_data,
            paf.range_africa AS range_africa_data,
            paf.style_name AS style_name_data,
            dc.name AS centre_name,
            oor.order_placement_date,
            oor.order_group_id,
            oor.editable_expected_receipt_date,
            oor.order_type AS order_type_data,
            oor.order_reason,
            oor.order_quantity,
            oor.size,
            oor.mode_shipment AS ship_mode,
            COALESCE(ast."order", 999999) AS size_order
        FROM filtered_orders oor
        JOIN paf_prefilter paf
            ON oor.product_code = paf.l4_name
        INNER JOIN global.distribution_centres dc
            ON dc.linked_store_code = oor.loc_code
            AND dc.is_active
            AND NOT dc.is_deleted
        LEFT JOIN ast_prefilter ast
            ON ast.size = oor.size AND ast.product_code = paf.product_code
    )
    ,grouped AS (
        SELECT
            loc_code_data,
            order_placement_date,
            l1_name_data,
            l2_name_data,
            l3_name_data,
            l4_name_data,
            style_name_data,
            range_usa_data,
            range_eu_uk_data,
            range_au_nz_data,
            range_asia_data,
            range_africa_data,
            MAX(bd.centre_name)::character varying AS centre_name,
            max(order_type_data) as order_type_data,
            max(editable_expected_receipt_date) as editable_expected_receipt_date,
            sum(order_quantity)::int as order_quantity,
            MAX(ship_mode)::character varying AS ship_mode,
            JSON_AGG(
                JSON_BUILD_OBJECT(
                    ''loc_code_data'',loc_code_data,
                    ''name'',centre_name,
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
        group by 1,2,3,4,5,6,7,8,9,10,11,12
        ' || v_having_clause || '
    )
    SELECT
        loc_code_data,
        order_placement_date,
        l1_name_data,
        l2_name_data,
        l3_name_data,
        l4_name_data,
        style_name_data,
        range_usa_data,
        range_eu_uk_data,
        range_au_nz_data,
        range_asia_data,
        range_africa_data,
        editable_expected_receipt_date,
        order_quantity,
        COUNT(*) OVER ()::integer AS total_count,
        SUM(order_quantity) OVER ()::int AS total_order_qty,
        ship_mode,
        status_obj,
        centre_name as name
    FROM grouped
    ' || v_where_clause || '
    ' || v_order_clause || '
    ' || v_limit_clause || ';
    ';

    RAISE NOTICE 'v_recommended_orders_sql %', v_recommended_orders_sql;

    RETURN QUERY EXECUTE v_recommended_orders_sql;

END
$function$
;
