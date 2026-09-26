--liquibase formatted sql
--changeset piyushraj:get_oms_style_order_summary_list_v3 runOnChange:true stripComments:false splitStatements:false context:MTP-101136v2 labels:MTP-91654v4
--comment: Added vendorname column to the query
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
    default_sort text := ' ORDER BY order_placement_date ASC, paf.article DESC, oor.order_group_id ASC ';
BEGIN
    -- Form product attributes filter query
    v_pa_query := global.form_main_table_filters('product_attributes_filter', $2);
    v_pa_query := REPLACE(v_pa_query, 'style', 'paf.style');
    RAISE NOTICE 'v_pa_query: %', v_pa_query;

 -- Add product attributes filter join
    v_where := 'INNER JOIN (SELECT * FROM global.product_attributes_filter ' || v_pa_query || ') paf ON paf.product_code = oor.product_code';

    -- Generate Choice filter dynamically
   IF styles IS NOT NULL AND styles <> '' THEN
       v_choice_filter := 'paf.article IN (' || styles || ')';
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
         v_meta_cls := REPLACE(v_meta_cls, 'vendor_name', 'paf.primary_vendor_name');
         v_meta_cls := REPLACE(v_meta_cls, 'WHERE', 'AND');
    END IF;

    -- Build the query
    v_query := 
    'SELECT
        paf.article,
        paf.style_color_desc,
        paf.l1_name,
        paf.l2_name,
        paf.l3_name,
        MIN(oor.order_placement_date) AS order_placement_date,
        MIN(oor.expected_receipt_date) as projected_delivery_date,
        oor.order_type,
        COALESCE(SUM(oor.order_quantity), 0) as order_quantity,
        ''View Order Info'' AS order_info,
        paf.primary_vendor_name as vendor_name,
        SUM(oor.unit_cost * oor.order_quantity) AS order_cost,
        SUM(paf.price * oor.order_quantity) AS order_retail,
        MIN(ok.min_order_quantity_sku) as min_order_quantity,
        SUM(oor.raw_roq) AS raw_roq, 
        SUM(oor.roq_unconstrained * paf.cost) as roq_unconstrained,
        SUM(oor.roq_constrained) as roq_constrained,
        SUM(oor.elt_projected_store_inv) AS store_inventory,
        SUM(oor.elt_projected_bop) AS projected_bop,
        SUM(coalesce(coalesce(oor.elt_projected_bop,0) + coalesce(oor.elt_projected_store_inv,0),0)) AS total_inventory,
--      as on_order
        COALESCE(SUM(opm.oo + opm.it), 0) AS on_order,
        SUM(oor.elt_projected_safety_stock) AS safety_stock,
		SUM(oor.unit_cost) as landing_cost,
        oor.order_gen_type,
        oor.order_group_id,
        oor.order_status_id
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
    ' || v_where || '
    where 1=1
    ' || v_meta_cls || ' AND ' || v_choice_filter || '
    AND oor.order_gen_type in (''Recommended'',''Scenario'',''Edited'',''edited'')
    ' || COALESCE('AND ' || v_time_filter, '') ||' 
    GROUP BY
        paf.article,
        paf.style_color_desc,
        paf.l1_name,
        paf.l2_name,
        paf.l3_name,
        oor.order_type,
        paf.primary_vendor_name,
        oor.order_gen_type,
        oor.order_group_id,
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