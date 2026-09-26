--liquibase formatted sql
--changeset vishal.kumar:get_oms_store_order_detailed_size_summary_v6 runOnChange:true stripComments:false splitStatements:false context:MTP-137546_5
--comment: optimize the query by adding order and choice filter in the where clause
--rollback: SELECT 1
DROP FUNCTION IF EXISTS inventory_smart.get_oms_store_order_detailed_size_summary(refcursor, jsonb, jsonb, jsonb, text, text, text, text,text);
DROP FUNCTION IF EXISTS inventory_smart.get_oms_store_order_detailed_size_summary(refcursor, jsonb, jsonb, jsonb, text, text, text, text,text, int);


CREATE OR REPLACE FUNCTION inventory_smart.get_oms_store_order_detailed_size_summary(input refcursor, product_filter jsonb, store_filter jsonb,meta jsonb, order_group_id text, styles text, months text, fiscal_weeks text,order_type text, p_order_status_id int)
 RETURNS refcursor
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_order_detailed_summary_sql TEXT := '';
    v_order_filter text := '';
    v_choice_filter text := '';
    v_time_filter text := '';
    v_meta_cls text := '';
    v_where text := '';
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
    v_store_code_sort jsonb := NULL;
    v_store_code_sort_direction text := 'ASC';
BEGIN
    -- Generate product attribute filter SQL
    v_pa_sql := inventory_smart.form_main_table_filters('ph_master', product_filter);

    -- Build store filter
    v_sa_sql := inventory_smart.form_main_table_filters('store_attributes_filter', store_filter);
-- Add product attributes filter join
    -- Generate Order filter
    IF order_group_id IS NOT NULL THEN
        v_order_filter := 'oors.order_group_id = ''' || order_group_id || '''';
    ELSE
        v_order_filter := ''; -- No order filter applied if the value is null
    END IF;

    -- Generate style filter dynamically
    IF styles IS NOT NULL THEN
        v_choice_filter := 'oors.article IN (' || styles || ')';
    ELSE
        v_choice_filter := '0=1'; -- No choice filter applied if the array is empty
    END IF;

  IF order_type IS NOT NULL AND order_type <> '' THEN
        v_order_type_filter := 'oors.order_type = ' || quote_literal(order_type);
    ELSE
        v_order_type_filter := '1=1';
    END IF;

    -- Generate month and fiscal month filter
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
        v_time_filter := '1=1'; -- No time filter applied if both arrays are empty
    END IF;

    IF meta IS NOT NULL AND jsonb_typeof(meta) = 'object' AND meta <> '{}'::jsonb THEN
        -- Check if size or store_code is in sort array and remove them
        IF meta->'sort' IS NOT NULL AND jsonb_array_length(meta->'sort') > 0 THEN
            FOR i IN 0..jsonb_array_length(meta->'sort')-1 LOOP
                IF (meta->'sort'->i->>'column') = 'size' THEN
                    v_size_sort := meta->'sort'->i;
                    -- Remove size from sort array
                    meta := jsonb_set(
                        meta,
                        '{sort}',
                        (meta->'sort') - i
                    );
                END IF;
                IF (meta->'sort'->i->>'column') = 'store_code' THEN
                    v_store_code_sort := meta->'sort'->i;
                    -- Remove store_code from sort array
                    meta := jsonb_set(
                        meta,
                        '{sort}',
                        (meta->'sort') - i
                    );
                END IF;
            END LOOP;
        END IF;
    END IF;

    -- Handle store_code sorting direction
    IF v_store_code_sort IS NOT NULL AND v_store_code_sort->>'order' = 'desc' THEN
        v_store_code_sort_direction := 'DESC';
    ELSE
        v_store_code_sort_direction := 'ASC';
    END IF;

    -- Handle size sorting
    IF v_size_sort IS NOT NULL AND v_size_sort->>'order' = 'desc' THEN
        v_order_direction := 'DESC';
    ELSE
        v_order_direction := 'ASC';
    END IF;

    search_json = meta;
    if meta <> '{}' and  meta -> 'limit' is not null then
        -- Extract the 'limit' object
        limit_json := meta -> 'limit';
        search_json := search_json - 'limit';
        v_limit_cls := global.form_table_query(jsonb_build_object('limit', limit_json)) ;
    end if;
     
    if meta <> '{}' and meta -> 'sort' is not null then 
     -- Extract the 'sort' object
        sort_json := meta -> 'sort';
        search_json := search_json - 'sort';
        v_sort_cls := global.form_table_query(jsonb_build_object('sort', sort_json)) ;
    end if;

    -- Generate meta conditions dynamically if provided
    IF meta <> '{}' THEN
        v_meta_cls := global.form_table_query(search_json);
        v_meta_cls := REPLACE(v_meta_cls, 'loc_code', 'oors.loc_code');
        v_meta_cls := REPLACE(v_meta_cls, 'size', 'oors.size');
        v_meta_cls := REPLACE(v_meta_cls, 'store_code', 'oors.store_code');
        v_meta_cls := REPLACE(v_meta_cls, 'min_order_quantity', 'oors.min_order_quantity_sku');
    END IF;

    -- Build the main query
    v_order_detailed_summary_sql := '
WITH store_filter AS (
    SELECT store_code,sales_org_name
    FROM global.store_attributes_filter
    ' || v_sa_sql || '
),
oors_product_filter AS (
    SELECT oors.*
    FROM inventory_smart.oms_orders_recommended_store oors
    inner join store_filter saf ON oors.store_code = saf.store_code
    ' || v_pa_sql || '
    AND oors.order_status_id = ' || p_order_status_id || '
    AND ' || v_order_filter || ' AND ' || v_choice_filter ||' AND ' || v_order_type_filter || ' AND ' || v_time_filter || '
)
SELECT 
    oors.size,
    max(oors.style_name) as style_name,
    SUM(oors.elt_projected_bop) AS dc_inv,
    SUM(oors.elt_projected_store_inv) AS elt_projected_store_inv,
    SUM(oors.elt_projected_safety_stock) as elt_projected_safety_stock,
    SUM(COALESCE(opm.oo, 0) + COALESCE(opm.it, 0)) as open_receipt_units,
    SUM(oors.elt_sales_forecast_twos) as elt_sales_forecast_twos,
    SUM(oors.raw_roq) as raw_roq,
    SUM(oors.roq_constrained) AS roq_constrained,
    SUM(oors.unit_cost * oors.order_quantity) AS order_cost,
    Max(oors.expected_receipt_date) as expected_receipt_date,
    Max(oors.order_placement_date) as order_placement_date,
    CASE 
        WHEN SUM(oors.order_quantity) = 0 THEN 0
        ELSE SUM(oors.unit_cost * oors.order_quantity) / SUM(oors.order_quantity)
    END as unit_cost,
    COALESCE(sum(oors.order_quantity), 0) as order_quantity,
    SUM(oors.ia_shipment_order_quantity) AS ia_shipment_order_quantity,
    COALESCE(SUM(oors.roq_unconstrained), 0) as roq_unconstrained,
    SUM(oors.order_to_po_processing_time) as order_to_po_processing_time,
    AVG(oors.editable_effective_lead_time)::INTEGER as editable_effective_lead_time,
    COALESCE(ROUND(AVG(oors.min_order_quantity_sku), 2), 0) as min_order_quantity,
    SUM(oors.max_order_quantity_sku) as max_order_quantity,
    CASE
        -- WHEN MAX(CASE WHEN oors.order_status_id IN (1, -1, 3) THEN 1 ELSE 0 END) = 1 THEN 2
        -- WHEN SUM(oors.raw_roq) > 0
        --      AND SUM(COALESCE(oors.roq_unconstrained, 0)) = 0
        --      AND SUM(oors.order_quantity) = 0 THEN 3
        WHEN COALESCE(sum(oors.order_quantity), 0) < COALESCE(ROUND(AVG(oors.min_order_quantity_sku), 2), 0) then 4
        -- WHEN SUM(COALESCE(oors.store_min, 0)) > SUM(COALESCE(oors.raw_roq, 0) + COALESCE(oors.elt_projected_store_inv, 0)) THEN 1
        ELSE 0
    END AS flag,
    SUM(COALESCE(oors.size_ratio_store / NULLIF(oors.size_ratio_size, 0), 0)) as size_ratio,
    --COALESCE(ROUND(AVG(oors.store_min)::numeric, 2), 0) AS store_min,
    max(oors.vendor_name) as vendor_name,
    max(oors.order_type) as order_type,
    JSON_AGG(
        JSON_BUILD_OBJECT(
            ''id'', oors.id,
            ''order_group_id'', oors.order_group_id,
            ''store_code'', oors.store_code,
            ''vendor_name'', oors.vendor_name,
            ''style_name'', oors.style_name,
            ''l6_name'', oors.l6_name,
            ''l1_name'', oors.l1_name,
            ''l2_name'', oors.l2_name,
            ''l3_name'', oors.l3_name,
            ''l5_name'', oors.l5_name,
            ''l0_name'', oors.l0_name,
            ''size_ratio'',COALESCE(oors.size_ratio_store / NULLIF(oors.size_ratio_size, 0), 0),
            ''size'', oors.size,
            ''dc_inv'', oors.elt_projected_bop,
            ''elt_projected_store_inv'', oors.elt_projected_store_inv,
            ''elt_projected_safety_stock'', oors.elt_projected_safety_stock,
            ''open_receipt_units'', COALESCE(opm.oo, 0) + COALESCE(opm.it, 0),
            ''elt_sales_forecast_twos'', oors.elt_sales_forecast_twos,
            ''order_placement_date'', oors.order_placement_date,
            ''unit_cost'', oors.unit_cost,
            ''order_quantity'', oors.order_quantity,
            ''order_cost'', oors.unit_cost * oors.order_quantity,
            ''raw_roq'', oors.raw_roq,
            ''ia_shipment_order_quantity'', oors.ia_shipment_order_quantity,
            ''roq_unconstrained'', COALESCE(oors.roq_unconstrained, 0),
            ''roq_constrained'', oors.roq_constrained,
            ''order_to_po_processing_time'', oors.order_to_po_processing_time,
            ''editable_effective_lead_time'', oors.editable_effective_lead_time,
            ''expected_receipt_date'', oors.expected_receipt_date,
            ''editable_expected_receipt_date'', oors.editable_expected_receipt_date,
            ''order_type'', oors.order_type,
            -- ''min_order_quantity'', COALESCE(oors.min_order_quantity_sku::text, ''-''),
            ''max_order_quantity'', oors.max_order_quantity_sku,
            ''order_multiple'', oors.order_multiple,
            ''order_reason'', oors.order_reason,
            ''ship_mode'', oors.edited_mode_shipment,
            ''order_gen_type'', oors.order_gen_type,
            ''mode_shipment'', oors.edited_mode_shipment,
            ''store_min'', oors.store_min,
            ''order_status'', CASE 
                WHEN oors.order_status_id = 0 THEN ''Recommended''
                WHEN oors.order_status_id = 1 THEN ''Pending Order''
                WHEN oors.order_status_id = -1 THEN ''Order Under Review''
                WHEN oors.order_status_id = 3 THEN ''Approved''
                ELSE ''Unknown''
            END,
            ''order_status_id'', oors.order_status_id,
            ''updated_by'', u.name,
            ''updated_at'', oors.updated_at,
            ''flag'', CASE 
                -- WHEN oors.order_status_id in (1,-1,3) THEN 2 -- 
                -- WHEN oors.raw_roq > 0
                --     AND oors.roq_unconstrained = 0
                --     AND oors.order_quantity = 0
                -- THEN 3 -- blue
                WHEN COALESCE(oors.order_quantity, 0) < COALESCE(oors.store_min, 0) THEN 4 --red
                -- WHEN store_min > oors.raw_roq + oors.elt_projected_store_inv then 1 -- orange
                ELSE 0
            END
        )
        ORDER BY oors.store_code ' || v_store_code_sort_direction || '
    ) AS status_obj
        from oors_product_filter oors
    left join
        global.user_master u on u.user_code = oors.updated_by
    LEFT JOIN
        inventory_smart.oms_po_master_store opm ON opm.product_code = oors.product_code and opm.fiscal_year_week = oors.fiscal_year_week and opm.store_code = oors.store_code
                ' || v_meta_cls || '
    GROUP BY 
        oors.size
    ' || v_sort_cls || ' ' || v_limit_cls || '';

    RAISE NOTICE 'v_order_detailed_summary_sql: %', v_order_detailed_summary_sql;

    -- Open the cursor for the constructed query
    OPEN input FOR EXECUTE v_order_detailed_summary_sql;
    RETURN input;
END
$function$
;