--liquibase formatted sql
--changeset raja.duraisamy:Added_style_order_summary_vs_test_update_22 runOnChange:true stripComments:false splitStatements:false context:MTP-113733 labels:style_order_summary_vs_test_update20.
--comment: Add dc inventory column in the parent level
--rollback: SELECT 1

DROP FUNCTION IF EXISTS inventory_smart.get_oms_style_order_detailed_size_summary(refcursor, jsonb, jsonb, text, text, text, text);

CREATE OR REPLACE FUNCTION inventory_smart.get_oms_style_order_detailed_size_summary(input refcursor, product_filter jsonb, meta jsonb, order_group_id text, styles text, months text, fiscal_weeks text)
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
BEGIN
    -- Generate product attribute filter SQL
    v_product_filter_sql := inventory_smart.form_main_table_filters('product_attributes_filter', product_filter);

    -- Add product attributes filter join
    v_where := 'JOIN (SELECT * FROM global.product_attributes_filter ' || v_product_filter_sql || ') paf ON paf.product_code = oor.product_code';

    -- Generate Order filter
    IF order_group_id IS NOT NULL THEN
        v_order_filter := 'oor.order_group_id = ''' || order_group_id || '''';
    ELSE
        v_order_filter := ''; -- No order filter applied if the value is null
    END IF;

    -- Generate style filter dynamically
    IF styles IS NOT NULL THEN
        v_choice_filter := 'oor.article IN (' || styles || ')';
    ELSE
        v_choice_filter := '0=1'; -- No Choice filter applied if the array is empty
    END IF;

    -- Generate month and fiscal month filter
    IF (months IS NOT NULL AND months <> '') OR (fiscal_weeks IS NOT NULL AND fiscal_weeks <> '') THEN
        v_time_filter := '(';
        IF months IS NOT NULL AND months <> '' THEN
            v_time_filter := v_time_filter || 'oor.month IN (' || upper(months)|| ')';
        END IF;
        IF fiscal_weeks IS NOT NULL AND fiscal_weeks <> '' THEN
            IF months IS NOT NULL AND months <> '' THEN
                v_time_filter := v_time_filter || ' OR ';
            END IF;
            v_time_filter := v_time_filter || 'oor.fiscal_year_week IN (' || fiscal_weeks || ')';
        END IF;
        v_time_filter := v_time_filter || ')';
    ELSE
        v_time_filter := '1=1'; -- No time filter applied if both arrays are empty
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
        v_meta_cls := REPLACE(v_meta_cls, 'loc_code', 'oor.loc_code');
        v_meta_cls := REPLACE(v_meta_cls, 'size', 'paf.size');
        v_meta_cls := REPLACE(v_meta_cls, 'order_status', 'order_gen_type');
    END IF;

    -- Build the main query
    v_order_detailed_summary_sql := '
WITH shipment_modes AS (
    SELECT 
        oclt.loc_code,
        oclt.article,
        oclt.mode_shipment,
        JSON_AGG(
            JSON_BUILD_OBJECT(
                ''shipment_mode'', oclt.mode_shipment,
                ''lead_time'', oclt.lead_time,
                ''default_mode'', oclt.default_mode
            )
        ) AS shipment_modes
    FROM 
        inventory_smart.oms_constraints_lead_time oclt
    GROUP BY 
        oclt.loc_code, 
        oclt.article,
        oclt.mode_shipment
)
SELECT 
    paf.size,
    SUM(COALESCE(ootb.otb, 0)) AS otb,
    SUM(oor.elt_projected_store_inv) AS store_inv,
    SUM(oor.elt_projected_store_inv * paf.cost) AS store_inv_cost,
    SUM(oor.elt_projected_store_inv * paf.price) AS store_inv_retail,
    SUM(oor.elt_projected_bop * paf.cost) AS dc_inv_cost,
    SUM(oor.elt_projected_bop * paf.price) AS dc_inv_retail,
    SUM(coalesce(coalesce(oor.elt_projected_bop,0) + coalesce(oor.elt_projected_store_inv,0),0)) AS system_inv,
    SUM(coalesce(coalesce(oor.elt_projected_bop,0) + coalesce(oor.elt_projected_store_inv,0),0) * paf.cost) AS system_inv_cost,
    SUM(coalesce(coalesce(oor.elt_projected_bop,0) + coalesce(oor.elt_projected_store_inv,0),0) * paf.price) AS system_inv_retail,
    coalesce(sum(opm.oo + opm.it), 0) as open_receipt_units,
    coalesce(sum((opm.oo + opm.it) * paf.cost), 0) as open_receipt_cost,
    coalesce(sum((opm.oo + opm.it) * paf.price), 0) as open_receipt_retail,
    sum(oor.elt_projected_safety_stock) as safety_stock,
    SUM(oor.roq_constrained) AS roq_constrained,
    SUM(oor.unit_cost * oor.order_quantity_eaches) AS order_cost,
    SUM(paf.price * oor.order_quantity_eaches) AS order_retail_cost,
    sum(oor.unit_cost) as unit_cost,
    sum(oor.order_quantity) as order_quantity,
	SUM(oor.order_quantity_eaches) AS order_quantity_eaches,
    SUM(oor.ia_shipment_order_quantity) AS ia_shipment_order_quantity,
    SUM(oor.raw_roq) as raw_roq,
    SUM(oor.roq_unconstrained) as roq_unconstrained,
    SUM(oor.order_to_po_processing_time) as order_to_po_processing_time,
    SUM(oor.lead_time) as lead_time,
    SUM(oor.min_order_quantity_sku) as min_order_quantity,
    SUM(oor.max_order_quantity_sku) as max_order_quantity,
	max(sm.mode_shipment) as ship_mode,
    SUM(oor.elt_projected_bop) as elt_projected_bop,
    oor.editable_expected_receipt_date,
    oor.order_placement_date,
    oor.order_status_id,
    JSON_AGG(
        JSON_BUILD_OBJECT(
            ''id'', oor.id,
            ''loc_code'', oor.loc_code,
            ''order_group_id'', oor.order_group_id,
            ''article'', paf.article,
            ''product_description'', paf.product_description,
            ''product_attribute_8'', paf.product_attribute_8,
            ''l3_name'', paf.l3_name,
            ''l4_name'', paf.l4_name,
            ''l5_name'', paf.l5_name,
            ''product_type'', paf.product_type,
            ''primary_vendor_name'', paf.primary_vendor_name,
            ''size'', paf.size,
            ''store_inv'', oor.elt_projected_store_inv,
            ''store_inv_cost'', oor.elt_projected_store_inv * paf.cost,
            ''store_inv_retail'', oor.elt_projected_store_inv * paf.price,
            ''elt_projected_bop'', oor.elt_projected_bop,
            ''dc_inv_cost'', oor.elt_projected_bop * paf.cost,
            ''dc_inv_retail'', oor.elt_projected_bop * paf.price,
            ''system_inv'', coalesce(coalesce(oor.elt_projected_bop,0) + coalesce(oor.elt_projected_store_inv,0),0),
            ''system_inv_cost'', coalesce(coalesce(oor.elt_projected_bop,0) + coalesce(oor.elt_projected_store_inv,0),0) * paf.cost,
            ''system_inv_retail'', coalesce(coalesce(oor.elt_projected_bop,0) + coalesce(oor.elt_projected_store_inv,0),0) * paf.price,
            ''open_receipt_units'', coalesce(opm.oo + opm.it, 0),
            ''safety_stock'', oor.elt_projected_safety_stock,
            ''order_placement_date'', oor.order_placement_date,
            ''unit_cost'', oor.unit_cost,
            ''order_quantity'', oor.order_quantity,
			''order_quantity_eaches'', oor.order_quantity_eaches,
            ''order_cost'', oor.order_quantity_eaches * oor.unit_cost,
            ''raw_roq'', oor.raw_roq,
            ''ia_shipment_order_quantity'', oor.ia_shipment_order_quantity,
            ''roq_unconstrained'', oor.roq_unconstrained,
            ''roq_constrained'', oor.roq_constrained,
            ''order_to_po_processing_time'', oor.order_to_po_processing_time,
            ''lead_time'', oor.lead_time,
            ''expected_receipt_date'', oor.expected_receipt_date,
            ''editable_expected_receipt_date'', oor.editable_expected_receipt_date,
            ''order_type'', oor.order_type,
            ''min_order_quantity'', oor.min_order_quantity_style,
            ''max_order_quantity'', oor.max_order_quantity_style,
            ''order_multiple'', oor.order_multiple,
            ''order_reason'', oor.order_reason,
            ''ship_mode'', oor.mode_shipment,
            ''otb'', ootb.otb,
            ''order_gen_type'', oor.order_gen_type,
            ''shipment_modes'', sm.shipment_modes
        )
    ) AS status_obj
        FROM
        inventory_smart.oms_orders_recommended oor
    LEFT JOIN 
        global.fiscal_date_mapping fdm ON fdm.calendar_date = oor.expected_receipt_date
    LEFT JOIN 
            shipment_modes sm ON sm.loc_code = oor.loc_code AND sm.article = oor.article 
    LEFT JOIN
            inventory_smart.oms_otb ootb ON ootb.product_code = oor.product_code AND ootb.loc_code = oor.loc_code AND ootb.channel = oor.channel AND ootb.fiscal_year_week = oor.fiscal_year_week
    LEFT JOIN
        (SELECT product_code,loc_code,fiscal_year_week,sum(oo) as oo, sum(it) as it FROM inventory_smart.oms_po_master GROUP BY 1,2,3) opm 
        ON opm.product_code = oor.product_code and opm.loc_code = oor.loc_code and opm.fiscal_year_week = fdm.fiscal_year_week
                ' || v_where || ' AND ' || v_order_filter || ' AND ' || v_choice_filter ||'
                ' || COALESCE('AND ' || v_time_filter, '') ||' 
                ' || v_meta_cls || '
    LEFT JOIN inventory_smart.oms_total_dc_forecast oaf on oaf.product_code =oor.product_code and oaf.loc_code =oor.loc_code and
    oaf.fiscal_year_week = oor.fiscal_year_week
    GROUP BY 
         paf.size,
         oor.editable_expected_receipt_date,
         oor.order_placement_date,
         oor.order_status_id
        '|| v_sort_cls ||' '|| v_limit_cls ||'';

    RAISE NOTICE 'v_order_detailed_summary_sql: %', v_order_detailed_summary_sql;

    -- Open the cursor for the constructed query
    OPEN input FOR EXECUTE v_order_detailed_summary_sql;
    RETURN input;
END
$function$
;