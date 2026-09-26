--liquibase formatted sql
--changeset nuttu.hariprasad:added sorting for multiple columns dynamic order by  column runOnChange:true stripComments:false splitStatements:false context:MTP-106880 labels:oms_populate_manual_orders
--comment: Rounding size distribution percentage to 2 decimal places and multiplying by 100
--rollback: SELECT 1

DROP FUNCTION IF EXISTS inventory_smart.oms_populate_manual_orders(jsonb, jsonb);
DROP FUNCTION IF EXISTS inventory_smart.oms_populate_manual_orders(jsonb, jsonb, jsonb);
DROP FUNCTION IF EXISTS inventory_smart.oms_populate_manual_orders(refcursor, jsonb, jsonb);

CREATE OR REPLACE FUNCTION inventory_smart.oms_populate_manual_orders(store_filter jsonb, product_filter jsonb, meta_filter jsonb)
 RETURNS TABLE(style_channel character varying, unique_row_id character varying, style character varying, min_order_quantity_style integer, style_description character varying, l0_name character varying, l1_name character varying, lead_time integer, po_to_order_processing integer, expected_receipt_date date, status_obj jsonb)
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_manual_orders_sql TEXT := '';
    v_pa_sql TEXT := '';
    v_sa_sql TEXT := '';
    v_where_clause TEXT := '';  -- Holds the WHERE clause
    v_meta_cls TEXT := ''; 
    v_limit_clause TEXT := '';  -- Holds the LIMIT/OFFSET clause
    v_order_clause_full TEXT := '';
    v_order_clause_clean TEXT := '';
    v_size_sort  jsonb := NULL;
    v_order_direction text := '';
    v_group_by_clause TEXT := '';
    v_extra_group_cols TEXT := '';
BEGIN
    -- Generate product attribute filter
    v_pa_sql := inventory_smart.form_main_table_filters(
        'ph_master',
        product_filter
    );

    -- Generate store attribute filter
    v_sa_sql := inventory_smart.form_main_table_filters(
        'ph_master',
        store_filter
    );

    -- Generate metadata filters if provided
    IF meta_filter <> '{}' THEN
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
        END IF;
        -- Handle size sorting
        IF v_size_sort IS NOT NULL AND v_size_sort->>'order' = 'desc' THEN
            v_order_direction := 'DESC';
        ELSE
            v_order_direction := 'ASC';
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
            v_order_clause_full := substring(v_meta_cls FROM 'ORDER\sBY\s.*?(?=\sLIMIT|\sOFFSET|$)');
			IF v_order_clause_full IS NULL THEN
			    v_extra_group_cols := NULL;
			ELSE
			    -- 2) remove the "ORDER BY" prefix (case-insensitive)
			    v_order_clause_clean := regexp_replace(v_order_clause_full, '^\s*ORDER\s+BY\s*', '', 'i');
			    RAISE NOTICE 'cleaned order clause: %', v_order_clause_full;
			
			    -- 3) split on commas, pull the identifier for each ordering expression,
			    --    dedupe (keeping first-seen order) and aggregate into a CSV
			    SELECT string_agg(col, ', ' ORDER BY first_ord)
			    INTO v_extra_group_cols
			    FROM (
			        SELECT col, min(ord) AS first_ord
			        FROM (
			            SELECT
			                row_number() OVER () AS ord,
			                -- try to capture: "quoted identifier" OR unquoted identifier (with dots) OR fallback to first token
			                coalesce(
			                    substring(trim(val) FROM '^\s*"([^"]+)"'),                       -- "quoted"
			                    substring(trim(val) FROM '^\s*([A-Za-z_][A-Za-z0-9_\.]*)'),    -- unquoted (with dots)
			                    regexp_replace(trim(split_part(val, ' ', 1)), '[^a-zA-Z0-9_.]', '', 'g') -- fallback
			                ) AS col
			            FROM regexp_split_to_table(v_order_clause_clean, ',') AS t(val)
			        ) x
			        WHERE col IS NOT NULL
			          AND col <> ''
			          AND upper(col) NOT IN ('ASC','DESC','NULLS','FIRST','LAST')
			        GROUP BY col
			    ) d;
			END IF;
			
			RAISE NOTICE 'v_extra_group_cols = %', v_extra_group_cols;
        END IF;
    END IF;
    raise notice 'v_extra_group_cols: %',v_extra_group_cols; 
	-- Build GROUP BY clause dynamically
    v_group_by_clause := '
    GROUP BY
        A.style_channel,
        A.unique_row_id,
        A.style,
        A.min_order_quantity_style,
        A.style_description,
        A.l0_name,
        A.l1_name,
        A.lead_time,
        A.po_to_order_processing' ||
        CASE WHEN v_extra_group_cols IS NOT NULL AND v_extra_group_cols <> '' 
             THEN ', ' || v_extra_group_cols ELSE '' END;

    -- Build the main query
    v_manual_orders_sql := '
    WITH paf_data AS materialized(
        SELECT 
            fd.product_code,
            fd.article,
            fd.style,
            fd.style_description,
            fd.l0_name,
            fd.l1_name,
            fd.l2_name,
            fd.l3_name,
            fd.l4_name,
            fd.l5_name,
            fd.size,
            fd.cost,
            fd.collection,
            fd.class,
            fd.season,
            fd.primary_vendor_cd,
            fd.primary_vendor_dsc,
            fd."order" as size_order
        FROM 
            (SELECT 
                paf.product_code,
                paf.article,
                paf.style,
                paf.style_description,
                paf.l0_name,
                paf.l1_name,
                paf.l2_name,
                paf.l3_name,
                paf.l4_name,
                paf.l5_name,
                paf.size,
                paf.cost,
                paf.collection,
                paf.class,
                paf.season,
                paf.primary_vendor_cd,
                paf.primary_vendor_dsc,
                ast."order"
            FROM "global".product_attributes_filter paf
            left join inventory_smart.article_status_tag ast on paf.product_code = ast.product_code and paf.size = ast.size ' || v_pa_sql || ' AND l0_name = ''USA'' AND active_ladder_flg = true AND ordering = ''Y'' AND active = true) fd
    ),

    size_distribution_data AS materialized(
        SELECT 
            ppc.product_code AS ppc_product_code,
            ppc.loc_code,
            ppc.article AS ppc_article,
            ppc.size AS ppc_size,
            ROUND(SUM(ppc.penetration)::NUMERIC, 2) AS size_distribution_percentage
        FROM 
            inventory_smart.dc_split_ratio ppc
        WHERE 
            to_char(current_date, ''YYYYIW'') = ppc.fiscal_year_week::character varying
        GROUP BY 
            ppc.product_code, ppc.loc_code, ppc.article, ppc.size
    ),

    kpi_data AS materialized(
        SELECT 
            ok.product_code,
            ok.store_inv,
            ok.dc_inv,
            ok.system_inv,
            ok.open_receipt_units,
            ok.safety_stock,
            ok.min_order_quantity_style,
            ok.min_order_quantity_sku,
            ok.min_order_quantity_shipment,
            ok.order_multiple
        FROM 
            inventory_smart.oms_kpi ok
    ),

    constraints_data AS materialized(
        SELECT 
            ocl.article,
            ocl.lead_time,
            ocl.po_to_order_processing
        FROM 
            inventory_smart.oms_constraints_lead_time ocl
    )

    SELECT
        A.style_channel,
        A.unique_row_id,
        A.style,
        A.min_order_quantity_style,
        A.style_description,
        A.l0_name,
        A.l1_name,
        A.lead_time,
		A.po_to_order_processing,
        NULL::date AS expected_receipt_date,
        jsonb_agg(
            jsonb_build_object(
                ''product_code'', A.product_code,
                ''status'', ''active'',
                ''style'', A.style,
                ''size'', A.size,
                ''size_distribution_percentage'', A.size_distribution_percentage,
                ''unique_row_id'', A.unique_row_id,
                ''article'', A.article,
                ''l1_name'', A.l1_name,
                ''l2_name'', A.l2_name,
                ''l3_name'', A.l3_name,
                ''l4_name'', A.l4_name,
                ''l5_name'', A.l5_name,
                ''collection'', A.collection,
                ''class'', A.class,
                ''season'', A.season,
                ''primary_vendor_cd'', A.primary_vendor_cd,
                ''primary_vendor_dsc'', A.primary_vendor_dsc,
                ''cost'', A.cost,
                ''store_inv'', A.store_inv,
                ''dc_inv'', A.dc_inv,
                ''system_inv'', A.system_inv,
                ''open_receipt_units'', A.open_receipt_units,
                ''safety_stock'', A.safety_stock,
                ''order_placement_date'', current_date,
                ''min_order_quantity_sku'', COALESCE(A.min_order_quantity_sku, 0),
                ''min_order_quantity_shipment'', A.min_order_quantity_shipment,
                ''order_multiple'', COALESCE(A.order_multiple, 1),
                ''lead_time'', A.lead_time,
                ''po_to_order_processing'', A.po_to_order_processing,
                ''fiscal_year'', to_char(current_date, ''YYYY''),
                ''fiscal_year_month'', to_char(current_date, ''YYYYMM''),
                ''fiscal_year_week'', to_char(current_date, ''YYYYIW''),
                ''fiscal_year_quarter'', trim(to_char(EXTRACT(YEAR FROM current_date), ''9999'') || lpad(EXTRACT(QUARTER FROM current_date)::text, 2, ''0'')),
                ''month'', upper(trim(to_char(current_date, ''Month'')))
            ) ORDER BY A.size_order ' || v_order_direction || '
        ) AS status_obj
    FROM (
        SELECT DISTINCT
            (paf.style::text || ''-'' || paf.l1_name::text)::character varying AS style_channel,
            (paf.style::text || ''-'' || paf.l1_name::text)::character varying AS unique_row_id,
            paf.style,
            kpi.min_order_quantity_style,
            paf.style_description,
            paf.l0_name,
            paf.l1_name,
            const_data.lead_time,
            const_data.po_to_order_processing,
            paf.product_code,
            paf.size,
            paf.article,
            paf.l2_name,
            paf.l3_name,
            paf.l4_name,
            paf.l5_name,
            paf.collection,
            paf.class,
            paf.season,
            paf.primary_vendor_cd,
            paf.primary_vendor_dsc,
            paf.cost,
            kpi.store_inv,
            kpi.dc_inv,
            kpi.system_inv,
            kpi.open_receipt_units,
            kpi.safety_stock,
            kpi.min_order_quantity_sku,
            kpi.min_order_quantity_shipment,
            kpi.order_multiple,
            sdd.size_distribution_percentage,
            paf.size_order
        FROM paf_data paf
        INNER JOIN kpi_data kpi ON paf.product_code = kpi.product_code
        INNER JOIN size_distribution_data sdd ON paf.product_code = sdd.ppc_product_code
        LEFT JOIN constraints_data const_data ON paf.article = const_data.article
        ' || v_where_clause || '
    ) A
     ' || v_group_by_clause || '
    ' || v_order_clause_full || '
    ' || v_limit_clause || '';

    RAISE NOTICE 'v_manual_orders_sql: %', v_manual_orders_sql;
    -- Execute and return the query results
    RETURN QUERY EXECUTE v_manual_orders_sql;

END
$function$
;