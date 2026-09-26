--liquibase formatted sql
--changeset aman.pareek:get_oms_style_order_summary_list_cbocs_23 runOnChange:true stripComments:false splitStatements:false context:MTP-101136v2 labels:MTP-91654v4
--comment: removed unit_cost from group by
--rollback: SELECT 1

DROP FUNCTION IF EXISTS oms.get_oms_style_order_summary_list(refcursor, jsonb, jsonb, text, text, text);

CREATE OR REPLACE FUNCTION oms.get_oms_style_order_summary_list(input refcursor, product_filter jsonb, meta jsonb, styles text, months text, fiscal_weeks text)
 RETURNS refcursor
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_choice_filter text := '';
    v_time_filter text := '';
    v_meta_cls text := '';
    v_query text := '';
    v_where text := '';
    v_pa_query text := '';
    v_limit_cls text := '';
    v_search_cls text := '';
    v_sort_cls text := '';
    limit_json jsonb := '{}';
    search_json jsonb:= '{}'; 
    sort_json jsonb := '{}';
    v_oaf_join_conditions text := '';
    default_sort text := ' ORDER BY order_placement_recom_date ASC, paf.article DESC, oor.order_group_id ASC ';
BEGIN
    -- Form product attributes filter query
    v_pa_query := global.form_main_table_filters('product_attributes_filter', $2);
    RAISE NOTICE 'v_pa_query: %', v_pa_query;

 -- Add product attributes filter join
    v_where := 'INNER JOIN (SELECT * FROM global.product_attributes_filter ' || v_pa_query || ') paf ON paf.product_code = oor.product_code';
    v_oaf_join_conditions := ' LEFT JOIN oms.oms_total_dc_forecast oaf ON oaf.product_code = oor.product_code and oaf.loc_code = oor.loc_code and oaf.fiscal_year_week = oor.fiscal_year_week';

    -- Generate Choice filter dynamically
   IF styles IS NOT NULL THEN
       v_choice_filter := 'paf.article IN (' || styles || ')';
   ELSE
       v_choice_filter := '0=1'; -- No Choice filter applied if the array is empty
   END IF;

    -- Generate month and fiscal month filter
    IF (months IS NOT NULL AND months <> '') OR (fiscal_weeks IS NOT NULL AND fiscal_weeks <> '') THEN
        v_time_filter := '(';
        IF months IS NOT NULL AND months <> '' THEN
            v_time_filter := v_time_filter || 'oor.month IN (' || upper(months) || ')';
        END IF;
        IF fiscal_weeks IS NOT NULL AND fiscal_weeks <> '' THEN
            IF months IS NOT NULL AND months <> '' THEN
                v_time_filter := v_time_filter || ' OR ';
            END IF;
            v_time_filter := v_time_filter || 'oor.fiscal_year_week IN (' || fiscal_weeks || ')';
        END IF;
        v_time_filter := v_time_filter || ')';
    ELSE
        v_time_filter := '0=1'; -- No time filter applied if both arrays are empty
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
         v_meta_cls := REPLACE(v_meta_cls, 'article', 'paf.article');
         v_meta_cls := REPLACE(v_meta_cls, 'vendor_name', 'oor.vendor_name');
    END IF;

    -- Build the query
    v_query := 
    'SELECT
        paf.article,
        paf.product_description,
        paf.l1_name,
        paf.l2_name,
        paf.l3_name,
        paf.product_type,
        paf.primary_vendor_name as vendor_name,
        SUM(COALESCE(ootb.otb, 0)) AS otb,
        oor.order_group_id,
        oor.order_type,
        oor.pack_id,
        ''View Order Info'' AS order_info,
        oor.order_status_id,
        SUM(COALESCE(ootb.otb, 0)) AS otb,
        MIN(oor.order_placement_date) AS order_placement_date,
        MIN(oor.order_placement_recom_date) AS order_placement_recom_date,
        CASE
            WHEN oor.pack_id IS NOT NULL AND oor.pack_id != ''WP'' THEN
                SUM(DISTINCT order_quantity)
            ELSE
                SUM(order_quantity)
        END AS order_quantity,
		CASE
            WHEN oor.pack_id IS NOT NULL THEN
                SUM(order_quantity_eaches)
            ELSE
                SUM(order_quantity)
        END AS order_quantity_eaches,
        SUM(oor.unit_cost * oor.order_quantity_eaches) AS order_cost,
        SUM(paf.price * oor.order_quantity_eaches) AS order_retail,
        SUM(oor.elt_projected_store_inv) AS store_inventory,
        SUM(oor.elt_projected_store_inv * paf.cost) AS store_inv_cost,
        SUM(oor.elt_projected_store_inv * paf.price) AS store_inv_retail,
        SUM(oor.elt_projected_bop * paf.cost) AS dc_inv_cost,
        SUM(oor.elt_projected_bop * paf.price) AS dc_inv_retail,
        SUM(oor.elt_projected_bop) AS dc_inventory,
        SUM(coalesce(coalesce(oor.elt_projected_bop,0) + coalesce(oor.elt_projected_store_inv,0),0)) AS total_inventory,
        SUM((oor.elt_projected_store_inv + oor.elt_projected_bop) * paf.cost) AS total_inventory_cost,
        SUM((oor.elt_projected_store_inv + oor.elt_projected_bop) * paf.price) AS total_inventory_retail,
        COALESCE(SUM(opm.oo + opm.it), 0) AS open_receipt_units,
        COALESCE(SUM((opm.oo + opm.it) * paf.cost), 0) AS open_receipt_cost,
        COALESCE(SUM((opm.oo + opm.it) * paf.price), 0) AS open_receipt_retail,
        SUM(oor.ia_shipment_order_quantity) as ia_shipment_order_quantity,
        CASE
            WHEN oor.pack_id IS NOT NULL AND oor.pack_id != ''WP'' THEN
                SUM(DISTINCT roq_unconstrained)
            ELSE
                SUM(roq_unconstrained)
        END AS roq_unconstrained,
		AVG(ok.order_multiple) as order_multiple,
        CASE
            WHEN oor.pack_id IS NOT NULL AND oor.pack_id != ''WP'' THEN
                SUM(DISTINCT roq_constrained)
            ELSE
                SUM(roq_constrained)
        END AS total_roq_constrained,
        SUM(oor.elt_projected_safety_stock) AS safety_stock,
        AVG(oor.min_order_quantity_style)::int AS min_order_quantity_style,
        MIN(oor.order_placement_recom_date) as order_placement_recom_date,
        SUM(distinct oor.raw_roq) AS raw_roq, 
        oor.order_gen_type,
        SUM(oor.unit_cost) as landing_unit_cost,
        MIN(oor.editable_expected_receipt_date) as editable_expected_receipt_date
    FROM
        oms.oms_orders_recommended oor
    LEFT JOIN
        global.fiscal_date_mapping fdm ON fdm.calendar_date = oor.expected_receipt_date
    LEFT JOIN
        oms.oms_otb ootb ON ootb.product_code = oor.product_code and ootb.loc_code = oor.loc_code and ootb.fiscal_year_week = oor.fiscal_year_week
    LEFT JOIN
        (SELECT product_code, loc_code, fiscal_year_week, SUM(oo) as oo, SUM(it) as it 
         FROM oms.oms_po_master 
         GROUP BY 1, 2, 3) opm 
        ON opm.product_code = oor.product_code and opm.loc_code = oor.loc_code and opm.fiscal_year_week = fdm.fiscal_year_week
    LEFT JOIN
        oms.oms_kpi ok ON ok.product_code = oor.product_code and ok.loc_code = oor.loc_code
    '  || v_oaf_join_conditions || '
    ' || v_where || '
    ' || v_meta_cls || ' AND ' || v_choice_filter || '
    AND oor.order_gen_type in (''Recommended'',''Scenario'',''Edited'',''edited'')
    ' || COALESCE('AND ' || v_time_filter, '') ||' 
    GROUP BY
        paf.article,
        paf.product_description,
        paf.product_type,
        paf.primary_vendor_name,
        oor.order_group_id,
        oor.order_type,
        oor.pack_id,
        paf.l1_name,
        paf.l2_name,
        paf.l3_name,
        oor.order_status_id,
        oor.order_gen_type
        '|| COALESCE(NULLIF(v_sort_cls, ''), default_sort) ||' '|| v_limit_cls ||'';
    -- Log the query for debugging
    RAISE NOTICE 'Executing query: %', v_query;

    -- Execute the query and open the refcursor
    OPEN input FOR EXECUTE v_query;

    -- Return the refcursor
    RETURN input;
END;
$function$
;
