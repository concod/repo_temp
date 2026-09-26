--liquibase formatted sql
--changeset chandranil.ghosh@gmail.com:oms_populate_manual_orders_vs_01 column runOnChange:true stripComments:false splitStatements:false context:MTP-110337 labels:oms_populate_manual_orders
--comment: added cost and order_placement_date columns

-- Drop existing functions if they exist
DROP FUNCTION IF EXISTS inventory_smart.oms_populate_manual_orders(jsonb, jsonb);
DROP FUNCTION IF EXISTS inventory_smart.oms_populate_manual_orders(jsonb, jsonb, jsonb);
DROP FUNCTION IF EXISTS inventory_smart.oms_populate_manual_orders(refcursor, jsonb, jsonb);

CREATE OR REPLACE FUNCTION inventory_smart.oms_populate_manual_orders(
    store_filter jsonb,
    product_filter jsonb,
    meta_filter jsonb
)
RETURNS TABLE (
    article character varying,
    style_name character varying,
    loc_code character varying,
    hierarchy_info text,
    l0_name character varying,
    l1_name character varying,
    l2_name character varying,
    l3_name character varying,
    vendor_id character varying,
    vendor_desc character varying,
    expected_receipt_date date,
    mode_shipment character varying,
    unique_row_id character varying,
    cost double precision,
    order_placement_date date,
    dc_inv bigint,
    system_inv bigint,
    store_inv bigint,
    open_receipt_units bigint,
    safety_stock bigint,
    min_order_quantity_sku bigint,
    lead_time numeric,
    status_obj jsonb
)
LANGUAGE plpgsql
AS $function$
DECLARE
    v_manual_orders_sql TEXT := '';
    v_pa_sql TEXT := '';
    v_sa_sql TEXT := '';
    v_meta_cls TEXT := '';
    v_where_clause TEXT := '';  -- To hold the WHERE clause
    v_limit_clause TEXT := '';  -- To hold the LIMIT/OFFSET clause
    v_order_clause TEXT := '';  -- To hold the ORDER BY clause
    v_size_sort  jsonb := NULL;
    v_order_direction text := '';
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

    -- Build the main query
    v_manual_orders_sql := '
    -- Store attributes filter materialized view
    WITH saf_data AS MATERIALIZED (
        SELECT 
            saf.dc_name,
            saf.store_code,
            saf.channel
        FROM (
            SELECT 
                dc_name,
                store_code,
                channel 
            FROM "global".store_attributes_filter 
            ' || v_sa_sql || '
        ) saf
    ),
    
    -- Product attributes filter materialized view
    paf_data AS MATERIALIZED (
        SELECT 
            paf.product_code,
            paf.size,
            paf.article,
            paf.cost,
            paf.l0_name,
            paf.l1_name,
            paf.l2_name,
            paf.l3_name,
            paf.style_name,
            paf.vendor_id,
            paf.vendor_desc,
            ast."order" AS size_order
        FROM (
            SELECT 
                product_code,
                article,
                l0_name,
                l1_name,
                l2_name,
                l3_name,
                style_name,
                size,
                cost,
                vendor_id,
                vendor_desc
            FROM "global".product_attributes_filter 
            ' || v_pa_sql || ' 
            AND ordering = ''Y''
        ) paf
        LEFT JOIN (
            SELECT product_code, size, MIN("order") AS "order"
            FROM inventory_smart.article_status_tag
            GROUP BY product_code, size
        ) ast ON paf.product_code = ast.product_code AND paf.size = ast.size
    ),

    -- KPI data materialized view
    kpi_data AS MATERIALIZED (
        SELECT 
            ok.product_code,
            ok.loc_code,
            ok.min_order_quantity_style,
            ok.min_order_quantity_sku,
            ok.dc_inv,
            ok.store_inv,
            ok.system_inv,
            ok.safety_stock,
            ok.open_receipt_units,
            ok.effective_lead_time AS lead_time,
            ok.order_multiple
        FROM inventory_smart.oms_kpi ok
    ),

    -- Size distribution data materialized view
    size_distribution_data AS MATERIALIZED (
        SELECT 
            dsr.product_code AS dsr_product_code,
            dsr.loc_code AS dsr_loc_code,
            dsr.article AS dsr_article,
            dsr.size AS dsr_size,
            ROUND(SUM(dsr.penetration)::NUMERIC, 2) AS size_distribution_percentage
        FROM 
            inventory_smart.dc_split_ratio dsr
        WHERE 
            to_char(current_date, ''YYYYIW'') = dsr.fiscal_year_week::character varying
        GROUP BY 
            dsr.product_code, dsr.loc_code, dsr.article, dsr.size
    ),

    -- Distribution centers data materialized view
    distribution_centers_data AS MATERIALIZED (
        SELECT DISTINCT
            dc.linked_store_code,
            dc.dc_code
        FROM 
            global.distribution_centres dc 
        WHERE 
            NOT dc.is_deleted
    ),

    -- Constraints data materialized view
    constraints_data AS MATERIALIZED (
        SELECT 
            ocl.article,
            ocl.lead_time,
            ocl.mode_shipment,
            ocl.po_to_order_processing
        FROM inventory_smart.oms_constraints_lead_time ocl
    )

    -- Main query
    SELECT 
        A.article,
        A.style_name,
        A.loc_code,
        ''-'' AS hierarchy_info,
        A.l0_name,
        A.l1_name,
        A.l2_name,
        A.l3_name,
        A.vendor_id,
        A.vendor_desc,
        NULL::date AS expected_receipt_date,
        A.mode_shipment,
        A.article AS unique_row_id,
        SUM(A.cost) as cost,
        current_date as order_placement_date,
        SUM(A.dc_inv) AS dc_inv,
        SUM(A.system_inv) AS system_inv,
        SUM(A.store_inv) AS store_inv,
        SUM(A.open_receipt_units) AS open_receipt_units,
        SUM(A.safety_stock) AS safety_stock,
        SUM(A.min_order_quantity_sku) AS min_order_quantity_sku,
        AVG(A.lead_time) AS lead_time, 
        jsonb_agg(
            jsonb_build_object(
                ''loc_code'', A.loc_code,
                ''unique_row_id'', A.article,
				''product_code'', A.product_code,
                ''min_order_quantity_style'', A.min_order_quantity_style,
                ''min_order_quantity_sku'', A.min_order_quantity_sku,
                ''lead_time'', COALESCE(A.lead_time, 0),
                ''order_placement_date'', current_date,
				''fiscal_year'', to_char(current_date, ''YYYY''),
                ''fiscal_year_month'', to_char(current_date, ''YYYYMM''),
                ''fiscal_year_week'', to_char(current_date, ''YYYYIW''),
                ''fiscal_year_quarter'', trim(to_char(EXTRACT(YEAR FROM current_date), ''9999'') || lpad(EXTRACT(QUARTER FROM current_date)::text, 2, ''0'')),
				''month'', upper(trim(to_char(current_date, ''Month''))),
                ''size'', A.size,
                ''size_order'', A.size_order,
                ''size_distribution_percentage'', A.size_distribution_percentage,
                ''cost'', A.cost,
                ''dc_inv'', A.dc_inv,
                ''store_inv'', A.store_inv,
                ''system_inv'', A.system_inv,
                ''safety_stock'', A.safety_stock,
                ''open_receipt_units'', A.open_receipt_units,
                ''editable_expected_receipt_date'', A.editable_expected_receipt_date,
                ''order_multiple'', A.order_multiple
            ) ORDER BY A.size_order ' || v_order_direction || '
        ) AS status_obj
    FROM (
        SELECT
            paf.article,
			paf.product_code,
            paf.style_name,
            kpi.loc_code,
            paf.l0_name,
            paf.l1_name,
            paf.l2_name,
            paf.l3_name,
            paf.vendor_id,
            paf.vendor_desc,
            const_data.mode_shipment,
            kpi.min_order_quantity_style,
            kpi.min_order_quantity_sku,
            COALESCE(const_data.lead_time, kpi.lead_time, 0) AS lead_time,
            paf.size,
            paf.size_order,
            sdd.size_distribution_percentage,
            paf.cost,
            kpi.dc_inv,
            kpi.store_inv,
            kpi.system_inv,
            kpi.safety_stock,
            kpi.open_receipt_units,
            oor.editable_expected_receipt_date,
            kpi.order_multiple
        FROM paf_data paf
        INNER JOIN kpi_data kpi 
            ON paf.product_code = kpi.product_code
        INNER JOIN distribution_centers_data dcd 
            ON dcd.linked_store_code = kpi.loc_code
        INNER JOIN saf_data saf 
            ON saf.store_code = dcd.linked_store_code
        INNER JOIN size_distribution_data sdd 
            ON paf.product_code = sdd.dsr_product_code
            AND paf.article = sdd.dsr_article
            AND paf.size = sdd.dsr_size
            AND kpi.loc_code = sdd.dsr_loc_code
        LEFT JOIN constraints_data const_data 
            ON const_data.article = paf.article
        LEFT JOIN inventory_smart.oms_orders_recommended oor
            ON paf.product_code = oor.product_code
            AND kpi.loc_code = oor.loc_code
            AND oor.order_status_id = 0
            AND NOT oor.is_deleted
            AND oor.order_gen_type = ''Manual''
    ) A ' || v_where_clause || '
    GROUP BY
        A.article,
        A.style_name,
        A.loc_code,
        hierarchy_info,
        A.l0_name,
        A.l1_name,
        A.l2_name,
        A.l3_name,
        A.vendor_id,
        A.vendor_desc,
        expected_receipt_date,
        A.mode_shipment
    ' || COALESCE(v_order_clause, 'ORDER BY article') || '
    ' || v_limit_clause || '';

    RAISE NOTICE 'v_manual_orders_sql: %', v_manual_orders_sql;
    RETURN QUERY EXECUTE v_manual_orders_sql;
END
$function$;