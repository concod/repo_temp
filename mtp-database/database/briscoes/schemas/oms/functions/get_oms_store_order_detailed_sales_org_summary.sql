--liquibase formatted sql
--changeset nikhil.dhoot:get_oms_store_order_detailed_sales_org_summary_v10 runOnChange:true stripComments:false splitStatements:false context:MTP-136977
--comment: adding order_placement_date to the result
--rollback: SELECT 1

DROP FUNCTION IF EXISTS inventory_smart.get_oms_store_order_detailed_sales_org_summary(refcursor, jsonb, jsonb, text, text, text, text, text, jsonb,text);
DROP FUNCTION IF EXISTS inventory_smart.get_oms_store_order_detailed_sales_org_summary(refcursor, jsonb, jsonb, text, text, text, text, text, jsonb,text, int);

CREATE OR REPLACE FUNCTION inventory_smart.get_oms_store_order_detailed_sales_org_summary(
    input refcursor,
    product_filter jsonb,
    store_filter jsonb,
    order_group_id text,
    styles text,
    months text,
    fiscal_weeks text,
    group_by text,
    meta jsonb,
    order_type text,
    p_order_status_id int
)
RETURNS refcursor
LANGUAGE plpgsql
AS $function$
DECLARE
    v_order_detailed_summary_sql TEXT := '';
    v_order_filter text := '';
    v_choice_filter text := '';
    v_time_filter text := '';
    v_meta_cls text := '';
    v_sort_cls text := '';
    v_limit_cls text := '';
    limit_json jsonb := '{}';
    search_json jsonb:= '{}';
    sort_json jsonb := '{}';
    v_product_filter_sql text := '';
    v_size_sort jsonb := NULL;
    v_order_direction text;
    v_pa_sql text := '';
    v_sa_sql text := '';
    v_order_type_filter text := '';
BEGIN
    -- Generate product attribute filter SQL
    v_pa_sql := inventory_smart.form_main_table_filters('ph_master', product_filter);

    -- Build store filter
    v_sa_sql := inventory_smart.form_main_table_filters('store_attributes_filter', store_filter);

    -- Order filter (kept for parity, not applied unless needed)
    IF order_group_id IS NOT NULL THEN
        v_order_filter := 'oors.order_group_id = ''' || order_group_id || '''';
    ELSE
        v_order_filter := '';
    END IF;

    -- Choice/style filter
    IF styles IS NOT NULL THEN
        v_choice_filter := 'oors.article IN (' || styles || ')';
    ELSE
        v_choice_filter := '0=1';
    END IF;

    -- Optional order type filter (computed but not applied, parity with previous)
    IF order_type IS NOT NULL AND order_type <> '' THEN
        v_order_type_filter := 'oors.order_type = ' || quote_literal(order_type);
    ELSE
        v_order_type_filter := '1=1';
    END IF;

    -- Month or fiscal week filter
    IF (months IS NOT NULL AND months <> '') OR (fiscal_weeks IS NOT NULL AND fiscal_weeks <> '') THEN
        v_time_filter := '(';
        IF months IS NOT NULL AND months <> '' THEN
            v_time_filter := v_time_filter || 'oors.month IN (' || upper(months)|| ')';
        END IF;
        IF fiscal_weeks IS NOT NULL AND fiscal_weeks <> '' THEN
            IF months IS NOT NULL AND months <> '' THEN
                v_time_filter := v_time_filter || ' OR ';
            END IF;
            v_time_filter := v_time_filter || 'oors.fiscal_year_week IN (' || fiscal_weeks || ')';
        END IF;
        v_time_filter := v_time_filter || ')';
    ELSE
        v_time_filter := '1=1';
    END IF;

    -- Extract and remove size from sort (used to order JSON array elements)
    IF meta IS NOT NULL AND jsonb_typeof(meta) = 'object' AND meta <> '{}'::jsonb THEN
        IF meta->'sort' IS NOT NULL AND jsonb_array_length(meta->'sort') > 0 THEN
            FOR i IN 0..jsonb_array_length(meta->'sort')-1 LOOP
                IF (meta->'sort'->i->>'column') = 'size' THEN
                    v_size_sort := meta->'sort'->i;
                    meta := jsonb_set(meta, '{sort}', (meta->'sort') - i);
                    EXIT;
                END IF;
            END LOOP;
        END IF;
    END IF;

    -- Size sort direction for JSON array
    IF v_size_sort IS NOT NULL AND v_size_sort->>'order' = 'desc' THEN
        v_order_direction := 'DESC';
    ELSE
        v_order_direction := 'ASC';
    END IF;

    -- Extract limit/sort from meta for outer query
    search_json = meta;
    IF meta <> '{}' AND meta -> 'limit' IS NOT NULL THEN
        limit_json := meta -> 'limit';
        search_json := search_json - 'limit';
        v_limit_cls := global.form_table_query(jsonb_build_object('limit', limit_json));
    END IF;

    IF meta <> '{}' AND meta -> 'sort' IS NOT NULL THEN
        sort_json := meta -> 'sort';
        search_json := search_json - 'sort';
        v_sort_cls := global.form_table_query(jsonb_build_object('sort', sort_json));
    END IF;

    -- Meta conditions: qualify columns to oors.*
    IF meta <> '{}' THEN
        v_meta_cls := global.form_table_query(search_json);
        v_meta_cls := REPLACE(v_meta_cls, 'loc_code', 'oors.loc_code');
        v_meta_cls := REPLACE(v_meta_cls, 'size', 'oors.size');
        v_meta_cls := REPLACE(v_meta_cls, 'store_code', 'oors.store_code');
        v_meta_cls := REPLACE(v_meta_cls, 'min_order_quantity', 'oors.min_order_quantity_sku');
    END IF;

    -- Main query rewritten per the provided shape
    v_order_detailed_summary_sql := '
WITH store_filter AS (
    SELECT store_code, sales_org_name
    FROM global.store_attributes_filter
    ' || v_sa_sql || '
),
oors_product_filter AS (
    SELECT oors.*
    FROM inventory_smart.oms_orders_recommended_store oors
    INNER JOIN store_filter saf ON oors.store_code = saf.store_code
    ' || v_pa_sql || '
    AND oors.order_status_id = ' || p_order_status_id || '
    AND ' || v_order_filter || ' AND ' || v_choice_filter || ' AND ' || v_order_type_filter || ' AND ' || v_time_filter || '
),
size_level_agg AS (
    SELECT
        oors.sales_org_name,
        oors.style_name,
        oors.size,
        SUM(oors.elt_projected_bop) AS dc_inv,
        SUM(oors.elt_projected_store_inv) AS elt_projected_store_inv,
        SUM(oors.elt_projected_safety_stock) AS elt_projected_safety_stock,
        SUM(COALESCE(opm.oo,0) + COALESCE(opm.it,0)) AS open_receipt_units,
        SUM(oors.elt_sales_forecast_twos) AS elt_sales_forecast_twos,
        SUM(oors.raw_roq) AS raw_roq,
        SUM(oors.roq_constrained) AS roq_constrained,
        SUM(COALESCE(oors.roq_unconstrained,0)) AS roq_unconstrained,
        SUM(oors.order_quantity) AS order_quantity,
        SUM(oors.unit_cost * oors.order_quantity) AS order_cost,
        CASE 
            WHEN SUM(oors.order_quantity) = 0 THEN 0
            ELSE SUM(oors.unit_cost * oors.order_quantity) / NULLIF(SUM(oors.order_quantity), 0)
        END AS unit_cost,
        SUM(oors.ia_shipment_order_quantity) AS ia_shipment_order_quantity,
        MAX(oors.expected_receipt_date) AS expected_receipt_date,
        MIN(oors.editable_expected_receipt_date) AS editable_expected_receipt_date,
        MAX(oors.order_placement_date) AS order_placement_date,
        AVG(oors.editable_effective_lead_time)::INTEGER AS editable_effective_lead_time,
        COALESCE(ROUND(AVG(oors.min_order_quantity_sku), 2), 0) as min_order_quantity,
        SUM(oors.max_order_quantity_sku) AS max_order_quantity,
        MAX(oors.vendor_name) AS vendor_name,
        MAX(oors.l6_name) AS l6_name,
        MAX(oors.l1_name) AS l1_name,
        MAX(oors.l2_name) AS l2_name,
        MAX(oors.l3_name) AS l3_name,
        MAX(oors.l5_name) AS l5_name,
        MAX(oors.l0_name) AS l0_name,
        SUM(COALESCE(oors.size_ratio_store / NULLIF(oors.size_ratio_size, 0), 0)) AS size_ratio,
        SUM(oors.order_to_po_processing_time) AS order_to_po_processing_time,
        MAX(oors.order_type) AS order_type,
        MAX(oors.order_multiple) AS order_multiple,
        MAX(oors.order_reason) AS order_reason,
        MAX(oors.edited_mode_shipment) AS ship_mode,
        MAX(oors.edited_mode_shipment) AS mode_shipment,
        MAX(oors.order_gen_type) AS order_gen_type,
        MAX(oors.order_status_id) AS order_status_id,
        CASE 
            WHEN MAX(oors.order_status_id) = 0 THEN ''Recommended''
            WHEN MAX(oors.order_status_id) = 1 THEN ''Pending Order''
            WHEN MAX(oors.order_status_id) = -1 THEN ''Order Under Review''
            WHEN MAX(oors.order_status_id) = 3 THEN ''Approved''
            ELSE ''Unknown''
        END AS order_status,
        MAX(u.name) AS updated_by,
        MAX(oors.updated_at) AS updated_at,
        array_agg(oors.id ORDER BY oors.id) AS order_ids,
        COALESCE(ROUND(AVG(oors.store_min)::numeric, 2), 0) AS store_min,
        MAX(oors.order_group_id) AS order_group_id,
        MIN(oors.store_code) AS store_code
        -- CASE
        --     WHEN MAX(CASE WHEN oors.order_status_id IN (1, -1, 3) THEN 1 ELSE 0 END) = 1 THEN 2
        --     WHEN SUM(oors.raw_roq) > 0 AND SUM(COALESCE(oors.roq_unconstrained, 0)) = 0 AND SUM(oors.order_quantity) = 0 THEN 3
        --     WHEN MAX(CASE WHEN COALESCE(oors.min_order_quantity_style, 0) > COALESCE(oors.order_quantity, 0) THEN 1 ELSE 0 END) = 1 THEN 4
        --     WHEN SUM(COALESCE(oors.store_min, 0)) > SUM(COALESCE(oors.raw_roq, 0) + COALESCE(oors.elt_projected_store_inv, 0)) THEN 1
        --     ELSE 0
        -- END AS flag
        from oors_product_filter oors
    LEFT JOIN
        inventory_smart.oms_po_master_store opm 
        ON opm.product_code = oors.product_code 
       AND opm.fiscal_year_week = oors.fiscal_year_week 
       AND opm.store_code = oors.store_code
    LEFT JOIN
        global.user_master u ON u.user_code = oors.updated_by
    ' || v_meta_cls || '
    GROUP BY
        oors.sales_org_name,
        oors.article,
        oors.style_name,
        oors.size
)
SELECT 
    s.sales_org_name,
    s.style_name,
    s.order_group_id,
    (
        SELECT array_agg(DISTINCT id)
        FROM (SELECT unnest(s2.order_ids) AS id FROM size_level_agg s2 WHERE s2.sales_org_name = s.sales_org_name AND s2.order_group_id = s.order_group_id) sub
    ) AS order_ids,
    min(s.editable_expected_receipt_date) as editable_expected_receipt_date,
    min(s.expected_receipt_date) as expected_receipt_date,
    sum(s.order_quantity) as order_quantity,
    sum(s.roq_constrained) as roq_constrained,
    sum(s.open_receipt_units) as open_receipt_units,
    MAX(s.order_placement_date) as order_placement_date,
    sum(s.order_cost) as order_cost,
    sum(s.elt_projected_safety_stock) as elt_projected_safety_stock,
    sum(s.elt_projected_store_inv) as elt_projected_store_inv,
    sum(s.elt_sales_forecast_twos) as elt_sales_forecast_twos,
    sum(s.raw_roq) as raw_roq,
    sum(s.roq_unconstrained) as roq_unconstrained,
    --MAX(s.store_min) as store_min,
    max(s.vendor_name) as vendor_name,
    max(s.order_type) as order_type,
    JSON_AGG(
        JSON_BUILD_OBJECT(
            ''unique_row_id'', gen_random_uuid(),
            ''order_ids'', s.order_ids,
            ''order_group_id'', s.order_group_id,
            ''store_code'', s.store_code,
            ''vendor_name'', s.vendor_name,
            ''style_name'', s.style_name,
            ''l6_name'', s.l6_name,
            ''l1_name'', s.l1_name,
            ''l2_name'', s.l2_name,
            ''l3_name'', s.l3_name,
            ''l5_name'', s.l5_name,
            ''l0_name'', s.l0_name,
            ''size_ratio'', s.size_ratio,
            ''size'', s.size,
            ''dc_inv'', s.dc_inv,
            ''elt_projected_store_inv'', s.elt_projected_store_inv,
            ''elt_projected_safety_stock'', s.elt_projected_safety_stock,
            ''open_receipt_units'', s.open_receipt_units,
            ''elt_sales_forecast_twos'', s.elt_sales_forecast_twos,
            ''raw_roq'', s.raw_roq,
            ''roq_constrained'', s.roq_constrained,
            ''roq_unconstrained'', s.roq_unconstrained,
            ''order_quantity'', s.order_quantity,
            ''order_cost'', s.order_cost,
            ''unit_cost'', s.unit_cost,
            ''ia_shipment_order_quantity'', s.ia_shipment_order_quantity,
            ''expected_receipt_date'', s.expected_receipt_date,
            ''editable_expected_receipt_date'', s.editable_expected_receipt_date,
            ''order_placement_date'', s.order_placement_date,
            ''editable_effective_lead_time'', s.editable_effective_lead_time,
            ''order_to_po_processing_time'', s.order_to_po_processing_time,
            ''min_order_quantity'', s.min_order_quantity,
            ''max_order_quantity'', s.max_order_quantity,
            ''order_type'', s.order_type,
            ''order_multiple'', s.order_multiple,
            ''order_reason'', s.order_reason,
            ''ship_mode'', s.ship_mode,
            ''order_gen_type'', s.order_gen_type,
            ''mode_shipment'', s.mode_shipment,
            ''order_status'', s.order_status,
            ''order_status_id'', s.order_status_id,
            --''store_min'', s.store_min,
            ''updated_by'', s.updated_by,
            ''updated_at'', s.updated_at
            -- ''flag'', s.flag
        ) ORDER BY s.size ' || v_order_direction || '
    ) AS status_obj
FROM 
    size_level_agg s
GROUP BY 
    s.sales_org_name,
    s.style_name,
    s.order_group_id
' || v_sort_cls || ' ' || v_limit_cls || '';

    RAISE NOTICE 'v_order_detailed_summary_sql: %', v_order_detailed_summary_sql;

    OPEN input FOR EXECUTE v_order_detailed_summary_sql;
    RETURN input;
END
$function$;

