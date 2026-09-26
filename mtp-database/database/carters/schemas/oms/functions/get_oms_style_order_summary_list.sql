--liquibase formatted sql
--changeset harsh.agrawal@impactanalytics.co:get_oms_style_order_summary_list_14 runOnChange:true stripComments:false splitStatements:false context:MTP-109416  labels:get_oms_style_order_summary_list_11
--comment: Fixed the sp error of string handling
--rollback: SELECT 1

DROP FUNCTION IF EXISTS inventory_smart.get_oms_style_order_summary_list(refcursor, jsonb, jsonb, text, text, text);

CREATE OR REPLACE FUNCTION inventory_smart.get_oms_style_order_summary_list(input refcursor, product_filter jsonb, meta jsonb, styles text, months text, fiscal_weeks text)
 RETURNS refcursor
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_style_filter text := '';
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
    default_sort text := ' ORDER BY order_placement_recom_date ASC, paf.style Desc,  oor.order_group_id ASC ';
BEGIN
    -- Form product attributes filter query
    v_pa_query := global.form_main_table_filters('product_attributes_filter', $2);
    RAISE NOTICE 'v_pa_query: %', v_pa_query;

    -- Add product attributes filter join
    v_where := 'INNER JOIN (SELECT * FROM global.product_attributes_filter ' || v_pa_query || ') paf ON paf.product_code = oor.product_code';
 
    -- Generate style filter dynamically
    IF styles IS NOT NULL THEN
        v_style_filter := 'paf.style IN (' || styles || ')';
    ELSE
        v_style_filter := '0=1'; -- No style filter applied if the array is empty
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
        v_meta_cls := REPLACE(v_meta_cls, 'style', 'paf.style');
    END IF;



    -- Build the query
    v_query := 
    'SELECT
        paf.style,
        oor.order_group_id,
        ''View Order Info'' AS order_info,
        paf.style_description,
        paf.l0_name,
        paf.l2_name,
        paf.l3_name,
        paf.l4_name,
        paf.l5_name,
        paf.collection,
        paf.class AS class,
        paf.season AS season,
        SUM(COALESCE(ootb.otb, 0)) AS otb,
        SUM(ok.store_inv) AS total_store_inventory,
        SUM(oor.elt_projected_bop) AS total_dc_inventory,
        SUM(oor.elt_projected_store_inv) as elt_projected_store_inv,
        SUM(coalesce(oor.elt_projected_bop + elt_projected_store_inv,0)) AS total_inventory,
        coalesce(SUM(opm.oo + opm.it),0) AS total_on_order,
        SUM(oor.elt_projected_safety_stock) AS total_safety_stock,
        SUM(oor.order_quantity) AS total_order_quantity,
        SUM(oor.unit_cost * oor.order_quantity) AS total_order_cost,
        SUM(oor.raw_roq) AS total_ia_original_order,
        SUM(oor.ia_shipment_order_quantity) as ia_shipment_order_quantity,
        SUM(oor.roq_unconstrained) as total_moq_constrained,
        SUM(oor.roq_unconstrained) as total_roq_constrained,
        SUM(oor.roq_constrained) as total_constrained,
        AVG(oor.min_order_quantity_style) as min_order_quantity_style,
        AVG(oor.min_order_quantity_style) as min_order_quantity,
        MIN(oor.order_placement_recom_date) as order_placement_recom_date,
        MIN(oor.editable_expected_receipt_date) as editable_expected_receipt_date,
        oor.order_status_id,
        STRING_AGG(DISTINCT oor.order_gen_type,'','' ORDER BY oor.order_gen_type) as order_gen_type
    FROM
        inventory_smart.oms_orders_recommended oor
    LEFT JOIN
        global.fiscal_date_mapping fdm ON fdm.calendar_date = oor.expected_receipt_date
    LEFT JOIN
        inventory_smart.oms_kpi ok ON ok.product_code = oor.product_code and ok.loc_code = oor.loc_code
    LEFT JOIN
        inventory_smart.oms_otb ootb ON oor.product_code = ootb.product_code AND oor.loc_code = ootb.loc_code AND oor.channel = ootb.channel AND oor.fiscal_year_week = ootb.fiscal_year_week
    LEFT JOIN
        (SELECT product_code,loc_code,fiscal_year_week,sum(oo) as oo, sum(it) as it FROM inventory_smart.oms_po_master GROUP BY 1,2,3) opm 
        ON opm.product_code = oor.product_code and opm.loc_code = oor.loc_code and opm.fiscal_year_week = fdm.fiscal_year_week
    ' || v_where || '
    ' || v_meta_cls || ' AND ' || v_style_filter || '
    ' || COALESCE('AND ' || v_time_filter, '') ||'
    GROUP BY
        paf.style,
        oor.order_group_id,
        paf.style_description,
        paf.l0_name,
        paf.l2_name,
        paf.l3_name,
        paf.l4_name,
        paf.l5_name,
        paf.collection,
        paf.class,
        paf.season,
        oor.order_status_id
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
