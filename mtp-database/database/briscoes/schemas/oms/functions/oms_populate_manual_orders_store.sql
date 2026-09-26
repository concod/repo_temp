--liquibase formatted sql
--changeset mssprakash.yashwanth@impactanalytics.co:oms_populate_manual_orders_store_16 column runOnChange:true stripComments:false splitStatements:false context:MTP-116150 labels:MTP-116150
--comment: added order_placement_date column
DROP FUNCTION IF EXISTS inventory_smart.oms_populate_manual_orders_store(jsonb, jsonb, jsonb);
CREATE OR REPLACE FUNCTION inventory_smart.oms_populate_manual_orders_store(store_filter jsonb, product_filter jsonb, meta_filter jsonb)
 RETURNS TABLE(article character varying, l1_name character varying, l2_name character varying, l3_name character varying, l5_name character varying, l6_name character varying, product_code character varying, style_name character varying, store_code character varying, vendor_name character varying, editable_expected_receipt_date date, unique_row_id character varying, landing_cost numeric, size_profile numeric, open_receipts_units numeric, store_inv numeric, order_placement_date date, safety_stock numeric, min_order_quantity_sku numeric, order_multiple numeric, lead_time integer, status_obj jsonb)
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_main_sql TEXT := '';
    v_pa_sql TEXT := '';
    v_sa_sql TEXT := '';
    v_meta_cls TEXT := ''; 
    v_where_clause TEXT := '';
    v_limit_clause TEXT := '';
    v_order_clause TEXT := '';
    v_conditions   TEXT := '';
    v_size_order_clause TEXT := '';
    -- Column mapping configuration for search filters
    v_column_mappings TEXT[] := ARRAY[
        -- Format: 'frontend_name|alternate_name', 'db_column_with_alias'
        
        -- Inventory columns (from oms_kpi_store - alias: ks)
        'total_inventory|system_inv', 'ks.store_inv',
        'on_order|open_receipt_units', 'ks.open_receipt_units',
        'lead_time|effective_lead_time', 'ks.effective_lead_time',
        'min_order_quantity_sku', 'ks.min_order_quantity_sku',
        'store_inv', 'ks.store_inv',
        'safety_stock', 'ks.safety_stock',
        'order_multiple', 'ks.order_multiple',
        'open_receipts_units', 'ks.open_receipt_units',
        'dc_inv', 'ks.dc_inv',
        'wos', 'ks.wos',
        'target_service_level', 'ks.target_service_level',
        'ss_base', 'ks.ss_base',
        'min_order_quantity_style', 'ks.min_order_quantity_style',
        'max_order_quantity_style', 'ks.max_order_quantity_style',
        'max_order_quantity_sku', 'ks.max_order_quantity_sku',
        'min_order_quantity_shipment', 'ks.min_order_quantity_shipment',
        'max_order_quantity_shipment', 'ks.max_order_quantity_shipment',
        'mrpc', 'ks.mrpc',
        'store_oh', 'ks.store_oh',
        'year_week', 'ks.year_week',
        
        -- Product columns (from paf_filtered - alias: p)
        'article', 'article',
        'product_code', 'p.product_code',
        'style_name', 'p.style_name',
        'vendor_name', 'p.vendor_name',
        'vendor_id', 'p.vendor_id',
        'l0_name', 'p.l0_name',
        'l1_name', 'p.l1_name',
        'l2_name', 'p.l2_name',
        'l3_name', 'p.l3_name',
        'l4_name', 'p.l4_name',
        'l5_name', 'p.l5_name',
        'l6_name', 'p.l6_name',
        'size', 'p.size',
        'cost|landing_cost', 'p.cost',
        
        -- Store columns (from store_filter - alias: s)
        'store_code', 's.store_code',
        
        -- Size profile/penetration columns (from store_split_ratio - alias: ssr)
        'size_profile|peneteration', 'COALESCE(ssr.peneteration, 0)'
    ];
    i INT;
    v_frontend_patterns TEXT[];
    v_db_column TEXT;
    v_pattern TEXT;
    v_size_sort jsonb := NULL;
    v_order_direction text := '';
BEGIN
    -- Build product filter using ph_master pattern similar to oms_populate_manual_orders
    v_pa_sql := inventory_smart.form_main_table_filters('ph_master', product_filter);

    -- Build store filter using the same aliasing approach
    v_sa_sql := inventory_smart.form_main_table_filters('ph_master', store_filter);

    -- Handle meta_filter (where/order/limit)
    IF meta_filter IS NOT NULL AND meta_filter <> '{}'::jsonb THEN
        -- Check if size is in sort array and remove it
        IF meta_filter IS NOT NULL AND jsonb_typeof(meta_filter) = 'object' AND meta_filter <> '{}'::jsonb THEN
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
        END IF;
        
        -- Handle size sorting direction
        IF v_size_sort IS NOT NULL THEN
            IF v_size_sort->>'order' = 'desc' THEN
                v_order_direction := 'DESC';
            ELSE
                v_order_direction := 'ASC';
            END IF;
            
            -- Build size order clause for status_obj
            v_size_order_clause := ' ORDER BY b.size ' || v_order_direction;
        END IF;
        
        v_meta_cls := global.form_table_query(meta_filter);

        -- Extract clauses in reverse order to avoid lookahead regex issues
        -- Step 1: Extract and remove LIMIT clause
        IF v_meta_cls ~* 'LIMIT' THEN
            v_limit_clause := substring(v_meta_cls FROM 'LIMIT\s.*$');
            v_meta_cls := regexp_replace(v_meta_cls, '\sLIMIT\s.*$', '', 'i');
        END IF;

        -- Step 2: Extract and remove ORDER BY clause
        IF v_meta_cls ~* 'ORDER BY' THEN
            v_order_clause := substring(v_meta_cls FROM 'ORDER\sBY\s.*$');
            v_meta_cls := regexp_replace(v_meta_cls, '\sORDER\sBY\s.*$', '', 'i');
        END IF;

        -- Step 3: What remains is the WHERE clause
        IF v_meta_cls ~* 'WHERE' THEN
            v_where_clause := substring(v_meta_cls FROM 'WHERE\s.*$');
        END IF;

        -- Map common legacy/meta columns to kpi_store aliases so filters work post-refactor
        IF v_where_clause IS NOT NULL AND v_where_clause <> '' AND trim(v_where_clause) <> '' THEN
        
            -- Apply column mappings using loop for easier maintenance
            FOR i IN 1..array_length(v_column_mappings, 1) BY 2 LOOP
                -- Get frontend pattern(s) and database column from mapping array
                v_frontend_patterns := string_to_array(v_column_mappings[i], '|');
                v_db_column := v_column_mappings[i + 1];
                
                -- Apply mapping for each pattern variant (e.g., 'total_inventory' and 'system_inv')
                FOREACH v_pattern IN ARRAY v_frontend_patterns LOOP
                    v_where_clause := regexp_replace(
                        v_where_clause,
                        '(^|[^A-Za-z0-9_\.])' || v_pattern || '([^A-Za-z0-9_]|$)',
                        E'\\1' || v_db_column || E'\\2',
                        'gi'
                    );
                END LOOP;
            END LOOP;
            
            -- Special handling for numeric columns used in text searches
            -- Replace: (COALESCE(ssr.peneteration, 0)::text ILIKE '%...')
            -- With: (CAST(ROUND(COALESCE(ssr.peneteration, 0)::numeric, 10) AS text) ILIKE '%...')
            v_where_clause := regexp_replace(
                v_where_clause,
                '\(COALESCE\(ssr\.peneteration,\s*0\)::text\s+(ILIKE|LIKE|NOT ILIKE|NOT LIKE)',
                '(CAST(ROUND(COALESCE(ssr.peneteration, 0)::numeric, 10) AS text) \1',
                'gi'
            );
        END IF;

        -- Only strip WHERE from v_where_clause for combining
        v_where_clause := regexp_replace(v_where_clause, '^\s*WHERE\s+', '', 'i');

        -- Build combined WHERE by stripping WHERE from v_pa_sql temporarily
        v_conditions := array_to_string(
            ARRAY[
                NULLIF(trim(regexp_replace(v_pa_sql, '^\s*WHERE\s+', '', 'i')), ''),
                NULLIF(trim(v_where_clause), '')
            ], ' AND '
        );

        -- Sanitize any accidental leading keywords
        v_conditions := regexp_replace(v_conditions, '^\s*(WHERE\s+)?', '', 'i');
        v_conditions := regexp_replace(v_conditions, '^\s*(AND|OR)\s+', '', 'i');

        IF v_conditions IS NOT NULL AND v_conditions <> '' THEN
            v_conditions := 'WHERE ' || v_conditions;
        END IF;
    END IF;

    -- Query mirrors manual orders approach using product attributes and kpi_store
    v_main_sql := '
    WITH store_filter AS (
        SELECT store_code
        FROM global.store_attributes_filter
        ' || v_sa_sql || '
    ),
    paf_filtered AS (
        SELECT 
                product_code,
                article AS unique_row_id,
                style_name,
                vendor_name,
                vendor_id,
                l0_name,
                l1_name,
                l2_name,
                l3_name,
                l4_name,
                l5_name,
                l6_name,
                size,
                cost
            FROM global.product_attributes_filter ' || v_pa_sql || ' AND ordering = ''Y''
    ),
    base_data AS (
        SELECT 
            article,
            p.l1_name,
            p.l2_name,
            p.l3_name,
            p.l5_name,
            p.l6_name,
            p.product_code,
            p.style_name,
            s.store_code,
            p.vendor_name,
            NULL::date AS editable_expected_receipt_date,
            p.l0_name,
            p.size,
            p.cost,
            ks.store_inv,
            ks.open_receipt_units,
            ks.safety_stock,
            ks.effective_lead_time AS ks_effective_lead_time,
            ks.min_order_quantity_sku AS ks_min_order_quantity_sku,
            ks.order_multiple,
            COALESCE(ssr.peneteration, 0) AS peneteration
            FROM inventory_smart.oms_kpi_store ks
            JOIN paf_filtered p ON ks.product_code = p.product_code
            JOIN store_filter s ON ks.store_code = s.store_code
            LEFT JOIN inventory_smart.store_split_ratio ssr 
                ON p.product_code = ssr.product_code 
            AND p.size = ssr.size
            AND ks.store_code = ssr.store_code
           ' || COALESCE(v_conditions, '') || '
    ),
    summary AS (
        SELECT 
            article,
            l1_name,
            l2_name,
            l3_name,
            l5_name,
            l6_name,
            product_code,
            style_name,
            store_code,
            vendor_name,
            editable_expected_receipt_date,
            AVG(cost)::numeric AS landing_cost,
            COALESCE(MAX(peneteration), 0)::numeric AS peneteration,
            SUM(open_receipt_units)::numeric AS open_receipt_units,
            SUM(store_inv)::numeric AS store_inv,
            gen_random_uuid()::character varying AS unique_row_id
        FROM base_data
        GROUP BY article, l1_name, l2_name, l3_name, l5_name, l6_name,
             product_code, style_name, store_code, vendor_name, editable_expected_receipt_date
    )
SELECT 
    s.article,
    s.l1_name,
    s.l2_name,
    s.l3_name,
    s.l5_name,
    s.l6_name,
    s.product_code,
    s.style_name,
    s.store_code,
    s.vendor_name,
    s.editable_expected_receipt_date,
    s.unique_row_id,
    Max(s.landing_cost)::numeric as landing_cost,
    Max(s.peneteration)::numeric AS size_profile,
    MAX(s.open_receipt_units)::numeric AS open_receipts_units,
    MAX(s.store_inv)::numeric as store_inv,
    current_date as order_placement_date,
    SUM(b.safety_stock)::numeric AS safety_stock,
    SUM(b.ks_min_order_quantity_sku)::numeric AS min_order_quantity_sku,
    SUM(b.order_multiple)::numeric AS order_multiple,
    AVG(b.ks_effective_lead_time)::INTEGER AS lead_time,
    jsonb_agg(
        jsonb_build_object(
            ''l0_name'', b.l0_name,
            ''order_quantity'', NULL,
            ''vendor_code'', ''-'',
            ''product_code'', b.product_code,
            ''size'', b.size,
            ''cost'', b.cost,
            ''store_code'', b.store_code,
            ''article'', b.article,
            ''unique_row_id'', s.unique_row_id,
            ''store_inv'', b.store_inv,
            ''open_receipts_units'', b.open_receipt_units,
            ''safety_stock'', b.safety_stock,
            ''lead_time'', b.ks_effective_lead_time,
            ''min_order_quantity_sku'', b.ks_min_order_quantity_sku,
            ''order_placement_date'', current_date,
            ''order_multiple'', b.order_multiple,
            ''size_profile'', b.peneteration,
            ''fiscal_year'', to_char(current_date, ''YYYY''),
            ''fiscal_year_month'', to_char(current_date, ''YYYYMM''),
            ''fiscal_year_week'', to_char(current_date, ''YYYYIW''),
            ''fiscal_year_quarter'', 
                trim(to_char(EXTRACT(YEAR FROM current_date), ''9999'') 
                || lpad(EXTRACT(QUARTER FROM current_date)::text, 2, ''0'')),
            ''month'', upper(trim(to_char(current_date, ''Month'')))
        )' || v_size_order_clause || '
    ) AS status_obj
FROM summary s
JOIN base_data b 
  ON s.article = b.article 
 AND s.store_code = b.store_code 
 AND s.vendor_name = b.vendor_name
GROUP BY 
    s.article, s.l1_name, s.l2_name, s.l3_name, s.l5_name, s.l6_name,
    s.product_code, s.style_name, s.store_code, s.vendor_name, 
    s.editable_expected_receipt_date, s.unique_row_id
    ' || COALESCE(v_order_clause, '') || '
    ' || COALESCE(v_limit_clause, '');

    RAISE NOTICE 'v_main_sql %', v_main_sql;

    RETURN QUERY EXECUTE v_main_sql;
END
$function$
;