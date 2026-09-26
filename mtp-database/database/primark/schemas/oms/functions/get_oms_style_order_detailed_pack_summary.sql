--liquibase formatted sql
--changeset aman.pareek:get_oms_style_order_detailed_pack_summary_update_13` runOnChange:true stripComments:false splitStatements:false context:MTP-130980 labels:update4
--comment: take distinct for raw_roq and roq_unconstrained
--rollback: SELECT 1

DROP FUNCTION IF EXISTS oms.get_oms_style_order_detailed_pack_summary(input refcursor, product_filter jsonb, meta jsonb, order_group_id text, styles text, months text, fiscal_weeks text);
 
CREATE OR REPLACE FUNCTION oms.get_oms_style_order_detailed_pack_summary(input refcursor, product_filter jsonb, meta jsonb, order_group_id text, styles text, months text, fiscal_weeks text)
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
    v_product_filter_sql := oms.form_main_table_filters('product_attributes_filter', product_filter);

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
        oms.oms_constraints_lead_time oclt
    GROUP BY 
        oclt.loc_code, 
        oclt.article,
        oclt.mode_shipment
),
oor_cte AS (
    SELECT *
    FROM oms.oms_orders_recommended oor
    WHERE ' || v_order_filter || ' AND ' || v_choice_filter || ' AND ' || v_time_filter || '
),
paf_cte AS (
    SELECT *
    FROM global.product_attributes_filter  
    ' || v_product_filter_sql || '
),
loc_code_grouping_cte AS (
    SELECT
        oor.loc_code,
		SUM(oor.roq_unconstrained) AS roq_unconstrained,
		SUM(oor.ia_shipment_order_quantity) AS ia_shipment_order_quantity,
		SUM(COALESCE(ootb.otb, 0)) AS otb,
		AVG(ok.order_multiple) as order_multiple,
        max(oor.order_group_id) as order_group_id,
        max(oor.article) as article,
        max(paf.product_description) as product_description,
        max(paf.l1_name) as l1_name,
        max(paf.l2_name) as l2_name,
        max(paf.l3_name) as l3_name,
        max(paf.product_type) as product_type,
        max(paf.primary_vendor_name) as primary_vendor_name,
        max(oor.size) as size,
        max(oor.id) as id,
        array_agg(oor.id) as ids,
        max(oor.pack_id) as pack_id,
        SUM(oor.elt_projected_store_inv) as store_inv,
        SUM(oor.elt_projected_store_inv * paf.cost) AS store_inv_cost,
        SUM(oor.elt_projected_store_inv * paf.price) AS store_inv_retail,
        SUM(coalesce(coalesce(oor.elt_projected_bop,0) + coalesce(oor.elt_projected_store_inv,0),0)) as system_inv,
        SUM(oaf.total_store_bop_inv) as total_store_bop_inv,
        SUM(oor.elt_projected_bop * paf.cost) AS dc_inv_cost,
        SUM(oor.elt_projected_bop * paf.price) AS dc_inv_retail,
        SUM(oor.elt_projected_bop) as dc_inv,
        SUM(coalesce(coalesce(oor.elt_projected_bop,0) + coalesce(oor.elt_projected_store_inv,0),0) * paf.cost) AS system_inv_cost,
        SUM(coalesce(coalesce(oor.elt_projected_bop,0) + coalesce(oor.elt_projected_store_inv,0),0) * paf.price) AS system_inv_retail,
        sum(coalesce(opm.oo + opm.it, 0)) as open_receipt_units,
        sum(coalesce((opm.oo + opm.it) * paf.cost, 0)) as open_receipt_cost,
        sum(coalesce((opm.oo + opm.it) * paf.price, 0)) as open_receipt_retail,
        sum(oor.elt_projected_safety_stock) as safety_stock,
        SUM(distinct oor.roq_constrained) as roq_constrained,
        SUM(oor.unit_cost * oor.order_quantity_eaches) as order_cost,
        SUM(paf.price * oor.order_quantity_eaches) AS order_retail_cost,
        sum(oor.unit_cost) as unit_cost,
        sum(distinct oor.order_quantity) as order_quantity,
        SUM(oor.order_quantity_eaches) AS order_quantity_eaches,
        SUM(distinct oor.raw_roq) as raw_roq,
        AVG(oor.order_to_po_processing_time) as order_to_po_processing_time,
        AVG(oor.lead_time)::integer as lead_time,
        oor.editable_expected_receipt_date,
        oor.order_placement_date,
        MAX(sm.shipment_modes::TEXT)::JSON AS shipment_modes,
        oor.order_status_id,
        oor.expected_receipt_date,
        oor.order_reason,
        MAX(sm.mode_shipment) as ship_mode,
        CONCAT(oor.loc_code, ''-'', oor.expected_receipt_date) as loc_projected_recommend_date,
        max(oor.order_type) as order_type,
        max(oor.order_gen_type) as order_gen_type,
        max(oor.min_order_quantity_style) as min_order_quantity,
        max(oor.max_order_quantity_style) as max_order_quantity

FROM
    oor_cte oor
LEFT JOIN 
    global.fiscal_date_mapping fdm ON fdm.calendar_date = oor.expected_receipt_date
LEFT JOIN
    shipment_modes sm ON sm.loc_code = oor.loc_code AND sm.article = oor.article 
LEFT JOIN
        oms.oms_otb ootb ON ootb.product_code = oor.product_code AND ootb.loc_code = oor.loc_code AND ootb.channel = oor.channel AND ootb.fiscal_year_week = oor.fiscal_year_week
LEFT JOIN
    (SELECT product_code, loc_code, fiscal_year_week, SUM(oo) as oo, SUM(it) as it 
     FROM oms.oms_po_master 
     GROUP BY 1, 2, 3) opm 
    ON opm.product_code = oor.product_code and opm.loc_code = oor.loc_code and opm.fiscal_year_week = fdm.fiscal_year_week
LEFT JOIN
    oms.oms_kpi ok ON ok.product_code = oor.product_code and ok.loc_code = oor.loc_code
JOIN paf_cte paf ON paf.product_code = oor.product_code
LEFT JOIN oms.oms_total_dc_forecast oaf on oaf.product_code = oor.product_code and oaf.loc_code = oor.loc_code and oaf.fiscal_year_week = oor.fiscal_year_week
GROUP BY 
   oor.loc_code,
   oor.pack_id,
   oor.editable_expected_receipt_date,
   oor.expected_receipt_date,
   oor.order_placement_date,
   oor.order_reason,
   oor.order_status_id
)

select
pack_id,
SUM(store_inv_cost) AS store_inv_cost,
SUM(store_inv_retail) AS store_inv_retail,
SUM(dc_inv_cost) AS dc_inv_cost,
SUM(dc_inv_retail) AS dc_inv_retail,
SUM(dc_inv) AS dc_inv,
SUM(otb) AS otb,
SUM(system_inv_cost) AS system_inv_cost,
SUM(system_inv_retail) AS system_inv_retail,
sum(open_receipt_units) as open_receipt_units,
sum(open_receipt_cost) as open_receipt_cost,
sum(open_receipt_retail) as open_receipt_retail,
sum(safety_stock) as safety_stock,
SUM(roq_constrained) as roq_constrained,
SUM(order_cost) as order_cost,
SUM(order_retail_cost) AS order_retail_cost,
sum(unit_cost) as unit_cost,
sum(distinct order_quantity) as order_quantity,
SUM(order_quantity_eaches) AS order_quantity_eaches,
SUM(distinct raw_roq) as raw_roq,
SUM(distinct roq_unconstrained) as roq_unconstrained,
AVG(order_to_po_processing_time) as order_to_po_processing_time,
editable_expected_receipt_date,
order_placement_date,
MAX(shipment_modes::TEXT)::JSON AS shipment_modes,
order_status_id,
expected_receipt_date,
order_reason,
MAX(lead_time) as lead_time,
MAX(ship_mode) as ship_mode,
MAX(loc_projected_recommend_date) as loc_projected_recommend_date,
JSON_AGG(
        JSON_BUILD_OBJECT(
            ''id'', id,
            ''ids'', ids,
            ''loc_code'', loc_code,
            ''order_group_id'', order_group_id,
            ''article'', article,
            ''product_description'', product_description,
            ''l1_name'', l1_name,
            ''l2_name'', l2_name,
            ''l3_name'', l3_name,
            ''product_type'', product_type,
            ''primary_vendor_name'', primary_vendor_name,
            ''size'', size,
    		''pack_id'', pack_id,
            ''store_inv'', store_inv,
            ''store_inv_cost'', store_inv_cost,
            ''store_inv_retail'', store_inv_retail,
            ''dc_inv'', dc_inv,
            ''dc_inv_cost'', dc_inv_cost,
            ''dc_inv_retail'', dc_inv_retail,
            ''system_inv'', system_inv,
            ''system_inv_cost'', system_inv_cost,
            ''system_inv_retail'', system_inv_retail,
            ''open_receipt_units'', open_receipt_units,
            ''open_receipt_cost'', open_receipt_cost,
            ''open_receipt_retail'', open_receipt_retail,
            ''safety_stock'', safety_stock,
            ''order_placement_date'', order_placement_date,
            ''unit_cost'', unit_cost,
            ''ia_shipment_order_quantity'', ia_shipment_order_quantity,
            ''order_quantity'', order_quantity,
			''order_quantity_eaches'', order_quantity_eaches,
            ''order_cost'', order_cost,
            ''raw_roq'', raw_roq,
            ''roq_unconstrained'', roq_unconstrained,
            ''roq_constrained'', roq_constrained,
            ''order_to_po_processing_time'', order_to_po_processing_time,
            ''lead_time'', lead_time,
            ''expected_receipt_date'', expected_receipt_date,
            ''editable_expected_receipt_date'', editable_expected_receipt_date,
            ''order_reason'', order_reason,
            ''order_type'', order_type,
            ''order_gen_type'', order_gen_type,
            ''min_order_quantity'', min_order_quantity,
            ''max_order_quantity'', max_order_quantity,
            ''order_multiple'', order_multiple,
            ''ship_mode'', ship_mode,
            ''loc_projected_recommend_date'', loc_projected_recommend_date,
            ''shipment_modes'', shipment_modes

        )
    ) AS status_obj from loc_code_grouping_cte
    group by pack_id,editable_expected_receipt_date,expected_receipt_date,order_placement_date,order_reason,order_status_id
        ' || v_sort_cls || ' ' || v_limit_cls || '';

    RAISE NOTICE 'v_order_detailed_summary_sql: %', v_order_detailed_summary_sql;

    -- Open the cursor for the constructed query
    OPEN input FOR EXECUTE v_order_detailed_summary_sql;
    RETURN input;
END
$function$
;
