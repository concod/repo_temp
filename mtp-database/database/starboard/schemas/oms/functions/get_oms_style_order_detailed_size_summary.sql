--liquibase formatted sql
--changeset piyushraj:Added_style_order_summary_size_view_v2 runOnChange:true stripComments:false splitStatements:false context:MTP-93522 labels:style_order_summary_vs_test_update21.
--comment: Add dc inventory column in the parent level
--rollback: SELECT 1

DROP FUNCTION IF EXISTS oms.get_oms_style_order_detailed_size_summary(refcursor, jsonb, jsonb, text, text, text, text);

CREATE OR REPLACE FUNCTION oms.get_oms_style_order_detailed_size_summary(input refcursor, product_filter jsonb, meta jsonb, order_group_id text, styles text, months text, fiscal_weeks text)
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
            v_time_filter := v_time_filter || 'UPPER(TRIM(oor.month)) IN (' || upper(months) || ')';
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
        MAX(oclt.po_to_order_processing) as po_to_order_processing,
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
)
SELECT 
    paf.size,
    oor.order_placement_date,
    oor.editable_expected_receipt_date,
    SUM(oor.elt_projected_store_inv) AS store_inv,
    MAX(oor.mode_shipment) as mode_shipment,
    SUM(oor.order_quantity) as order_quantity,
    SUM(oor.unit_cost * oor.order_quantity) AS order_cost,
    SUM(oor.elt_projected_bop) AS projected_bop,
    SUM(coalesce(coalesce(oor.elt_projected_bop,0) + coalesce(oor.elt_projected_store_inv,0),0)) AS system_inv,
    sum(oor.elt_projected_safety_stock) as safety_stock,
    sum(oor.unit_cost) as unit_cost,
    SUM(oor.raw_roq) as raw_roq,
    SUM(oor.roq_unconstrained * paf.cost) as roq_unconstrained,
    SUM(oor.lead_time) as lead_time,
    SUM(oor.roq_constrained) AS roq_constrained,
    MIN(ok.min_order_quantity_sku)  as min_order_quantity,
    MAX(ok.max_order_quantity_sku) as max_order_quantity,
    MAX(sm.po_to_order_processing) as po_to_order_processing,
	oor.expected_receipt_date,
    oor.order_status_id,
    JSON_AGG(
        JSON_BUILD_OBJECT(
            ''id'', oor.id,
            ''order_group_id'', oor.order_group_id,
            ''article'', paf.article,
			''dc_name'', saf.dc_name,
            ''primary_vendor_name'', paf.primary_vendor_name,
            ''order_placement_date'', oor.order_placement_date,
            ''editable_expected_receipt_date'', oor.editable_expected_receipt_date,
            ''mode_shipment'', oor.mode_shipment,
			''expected_receipt_date'', expected_receipt_date,
            ''order_cost'', oor.order_quantity * oor.unit_cost,
			''store_inv'', oor.elt_projected_store_inv,
            ''order_quantity'', oor.order_quantity,
            ''projected_bop'', oor.elt_projected_bop,
            ''system_inv'', coalesce(coalesce(oor.elt_projected_bop,0) + coalesce(oor.elt_projected_store_inv,0),0),
            ''safety_stock'', oor.elt_projected_safety_stock,
            ''unit_cost'', oor.unit_cost,
            ''raw_roq'', oor.raw_roq,
            ''roq_unconstrained'', oor.roq_unconstrained,
            ''lead_time'', oor.lead_time,
            ''roq_constrained'', oor.roq_constrained,
            ''min_order_quantity'', ok.min_order_quantity_sku,
            ''max_order_quantity'', ok.max_order_quantity_sku,
--            ''po_to_order_processing'', sm.po_to_order_processing,
            ''order_status_id'', oor.order_status_id,
            ''shipment_modes'', sm.shipment_modes,
            ''order_type'', oor.order_type
        )
    ) AS status_obj
        FROM
        oms.oms_orders_recommended oor
    LEFT JOIN
    global.fiscal_date_mapping fdm ON fdm.calendar_date = oor.expected_receipt_date
    LEFT JOIN 
            shipment_modes sm ON sm.loc_code = oor.loc_code AND sm.article = oor.article 
    LEFT JOIN
            oms.oms_kpi ok ON ok.product_code = oor.product_code and ok.loc_code = oor.loc_code
    LEFT JOIN
            global.store_attributes_filter saf ON oor.loc_code = saf.store_code
                ' || v_where || ' AND ' || v_order_filter || ' AND ' || v_choice_filter ||'
                ' || COALESCE('AND ' || v_time_filter, '') ||' 
                ' || v_meta_cls || '
    GROUP BY 
         paf.size,
         oor.editable_expected_receipt_date,
         oor.order_placement_date,
		 oor.expected_receipt_date,
         oor.order_status_id
        '|| v_sort_cls ||' '|| v_limit_cls ||'';

    RAISE NOTICE 'v_order_detailed_summary_sql: %', v_order_detailed_summary_sql;

    -- Open the cursor for the constructed query
    OPEN input FOR EXECUTE v_order_detailed_summary_sql;
    RETURN input;
END
$function$
;