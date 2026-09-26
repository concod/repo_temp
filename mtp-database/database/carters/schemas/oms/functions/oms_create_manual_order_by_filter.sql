--liquibase formatted sql
--changeset vishal.kumar:oms_create_manual_order_by_filter_init runOnChange:true stripComments:false splitStatements:false context:MTP-xxxx labels:oms_create_manual_order_by_filter
--comment: Create manual orders from filters by combining filter logic and insert logic

DROP FUNCTION IF EXISTS inventory_smart.oms_create_manual_order_by_filter(store_filter jsonb, product_filter jsonb, meta_filter jsonb, user_id integer, order_batch_name text);

CREATE OR REPLACE FUNCTION inventory_smart.oms_create_manual_order_by_filter(
    store_filter jsonb,
    product_filter jsonb,
    meta_filter jsonb,
    user_id integer,
    order_batch_name text
)
RETURNS TABLE(id bigint, product_code character varying, loc_code character varying, vendor_code character varying, rop date)
LANGUAGE plpgsql
AS $function$
DECLARE
    v_gen_random_uuid text := gen_random_uuid()::varchar;
    v_pa_sql TEXT := '';
    v_sa_sql TEXT := '';
    v_where_clause TEXT := '';
    v_limit_clause TEXT := '';
    v_meta_cls TEXT := '';
    v_sql TEXT := '';
BEGIN
    PERFORM global.sp_log(v_gen_random_uuid, 'inventory_smart.oms_create_manual_order_by_filter', 'Begin function', NULL, jsonb_build_object('$1', store_filter, '$2', product_filter, '$3', meta_filter, '$4', user_id, '$5', order_batch_name));

    -- Build product/store filters like oms_populate_manual_orders
    v_pa_sql := inventory_smart.form_main_table_filters(
        'ph_master',
        product_filter
    );

    v_sa_sql := inventory_smart.form_main_table_filters(
        'ph_master',
        store_filter
    );

    -- Build WHERE and LIMIT clauses from meta_filter (same extraction style)
    IF meta_filter <> '{}' THEN
        IF meta_filter IS NOT NULL AND jsonb_typeof(meta_filter) = 'object' AND meta_filter <> '{}'::jsonb THEN
            v_meta_cls := global.form_table_query(meta_filter);

            IF v_meta_cls ~* 'WHERE' THEN
                v_where_clause := substring(v_meta_cls FROM 'WHERE\s.*?(?=\sLIMIT|\sOFFSET|$)');
            END IF;

            IF v_meta_cls ~* 'LIMIT' THEN
                v_limit_clause := substring(v_meta_cls FROM 'LIMIT\s.*$');
            END IF;
        END IF;
    END IF;

    -- Compose dynamic SQL: filter using same CTEs as oms_populate_manual_orders and insert rows
    v_sql := '
    WITH paf_data AS materialized (
        SELECT 
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
            paf.primary_vendor_dsc
        FROM "global".product_attributes_filter paf
        LEFT JOIN inventory_smart.article_status_tag ast
          ON paf.product_code = ast.product_code
         AND paf.size = ast.size ' || v_pa_sql || ' 
         AND l0_name = ''USA''
         AND active_ladder_flg = true
         AND ordering = ''Y''
         AND active = true
    ),
    kpi_data AS materialized (
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
        FROM inventory_smart.oms_kpi ok
    ),
    constraints_data AS materialized (
        SELECT 
            ocl.article,
            ocl.lead_time,
            ocl.po_to_order_processing
        FROM inventory_smart.oms_constraints_lead_time ocl
    ),
    filtered AS (
        SELECT DISTINCT
            paf.product_code,
            paf.article,
            paf.style,
            paf.l0_name,
            paf.l1_name,
            paf.size,
            paf.cost,
            paf.collection,
            paf.class,
            paf.season,
            paf.primary_vendor_cd,
            paf.primary_vendor_dsc,
            kpi.store_inv,
            kpi.dc_inv,
            kpi.system_inv,
            kpi.open_receipt_units,
            kpi.safety_stock,
            kpi.min_order_quantity_style,
            kpi.min_order_quantity_sku,
            kpi.min_order_quantity_shipment,
            kpi.order_multiple,
            const_data.lead_time,
            const_data.po_to_order_processing
        FROM paf_data paf
        INNER JOIN kpi_data kpi ON paf.product_code = kpi.product_code
        LEFT JOIN constraints_data const_data ON paf.article = const_data.article
        ' || COALESCE(v_where_clause, '') || '
        ' || COALESCE(v_limit_clause, '') || '
    )
    INSERT INTO inventory_smart.oms_orders_recommended (
        order_gen_type,
        product_code,
        vendor_code,
        vendor_name,
        rop,
        raw_roq,
        ia_shipment_order_quantity,
        order_quantity,
        unit_cost,
        order_cost,
        roq_constrained,
        roq_unconstrained,
        order_placement_date,
        order_placement_recom_date,
        expected_receipt_date,
        editable_expected_receipt_date,
        rop_ideal,
        lead_time,
        effective_lead_time,
        min_order_quantity_sku,
        min_order_quantity_style,
        min_order_quantity_shipment,
        max_order_quantity_sku,
        order_multiple,
        order_status_id,
        created_by,
        created_at,
        updated_by,
        updated_at,
        approve_by_date,
        is_deleted,
        is_resolved,
        inventory_hold,
        month,
        style,
        size,
        article,
        channel,
        fiscal_year,
        fiscal_year_quarter,
        fiscal_year_month,
        fiscal_year_week,
        order_batch_name
    )
    SELECT 
        ''Manual'' AS order_gen_type,
        f.product_code,
        f.primary_vendor_cd AS vendor_code,
        f.primary_vendor_dsc AS vendor_name,
        current_date AS rop,
        COALESCE(f.min_order_quantity_sku, 0) AS raw_roq,
        COALESCE(f.min_order_quantity_sku, 0) AS ia_shipment_order_quantity,
        COALESCE(f.min_order_quantity_sku, 0) AS order_quantity,
        COALESCE(f.cost, 0) AS unit_cost,
        COALESCE(f.cost, 0) * COALESCE(f.min_order_quantity_sku, 0) AS order_cost,
        COALESCE(f.min_order_quantity_sku, 0) AS roq_constrained,
        COALESCE(f.min_order_quantity_sku, 0) AS roq_unconstrained,
        current_date AS order_placement_date,
        current_date AS order_placement_recom_date,
        CASE 
            WHEN f.lead_time IS NOT NULL THEN (current_date + ((f.lead_time + COALESCE(f.po_to_order_processing, 0))::text || '' days'')::interval)::date
            ELSE NULL::date
        END AS expected_receipt_date,
        CASE 
            WHEN f.lead_time IS NOT NULL THEN (current_date + ((f.lead_time + COALESCE(f.po_to_order_processing, 0))::text || '' days'')::interval)::date
            ELSE NULL::date
        END AS editable_expected_receipt_date,
        current_date AS rop_ideal,
        f.lead_time,
        f.lead_time AS effective_lead_time,
        f.min_order_quantity_sku,
        f.min_order_quantity_style,
        f.min_order_quantity_shipment,
        NULL::int AS max_order_quantity_sku,
        COALESCE(f.order_multiple, 1) AS order_multiple,
        1 AS order_status_id,
        ' || user_id || ' AS created_by,
        CURRENT_TIMESTAMP AS created_at,
        ' || user_id || ' AS updated_by,
        CURRENT_TIMESTAMP AS updated_at,
        CURRENT_DATE + 7 AS approve_by_date,
        FALSE AS is_deleted,
        TRUE AS is_resolved,
        0 AS inventory_hold,
        UPPER(trim(to_char(current_date, ''Month''))) AS month,
        f.style,
        f.size,
        f.article,
        f.l1_name AS channel,
        to_char(current_date, ''YYYY'') AS fiscal_year,
        trim(to_char(EXTRACT(YEAR FROM current_date), ''9999'') || lpad(EXTRACT(QUARTER FROM current_date)::text, 2, ''0'')) AS fiscal_year_quarter,
        to_char(current_date, ''YYYYMM'')::int AS fiscal_year_month,
        to_char(current_date, ''YYYYIW'')::int AS fiscal_year_week,
        ' || quote_literal(order_batch_name) || ' AS order_batch_name
    FROM filtered f
    ON CONFLICT DO NOTHING
    RETURNING 
        inventory_smart.oms_orders_recommended.id::bigint,
        inventory_smart.oms_orders_recommended.product_code,
        inventory_smart.oms_orders_recommended.loc_code,
        inventory_smart.oms_orders_recommended.vendor_code,
        inventory_smart.oms_orders_recommended.rop';

    RETURN QUERY EXECUTE v_sql;
END;
$function$;


