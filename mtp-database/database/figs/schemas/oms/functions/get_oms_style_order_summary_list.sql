--liquibase formatted sql
--changeset mssprkash.yashwanth@impactanalytics.co:get_oms_style_order_summary_list_update_34 runOnChange:true stripComments:false splitStatements:false context:MTP-MTP-110010 labels:style_order_summary_vs_test_update_32
--comment: fixing syntax error
--rollback: SELECT 1

DROP FUNCTION IF EXISTS inventory_smart.get_oms_style_order_summary_list(refcursor, jsonb, jsonb, text, text, text);

CREATE OR REPLACE FUNCTION inventory_smart.get_oms_style_order_summary_list(input refcursor, product_filter jsonb, meta jsonb, styles text, months text, fiscal_weeks text)
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
    v_having_cls text := '';
    limit_json jsonb := '{}';
    search_json jsonb:= '{}'; 
    sort_json jsonb := '{}';
    default_sort text := ' ORDER BY editable_expected_receipt_date ASC, oor.article DESC, oor.order_group_id ASC';
BEGIN
    -- Form product attributes filter query
    v_pa_query := global.form_main_table_filters('product_attributes_filter', $2);
    RAISE NOTICE 'v_pa_query: %', v_pa_query;

    -- Add product attributes filter join
    v_where := 'JOIN (SELECT * FROM global.product_attributes_filter ' || v_pa_query || ') paf ON paf.product_code = oor.product_code';

    -- Generate Choice filter dynamically
    IF styles IS NOT NULL AND styles <> '' AND styles <> '[]' THEN
        v_choice_filter := 'oor.article IN (' || styles || ')';
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


    -- Extract total_roq_unconstrained from range filters for HAVING clause
    if search_json ? 'range' then
        -- Process each range filter to find total_roq_unconstrained
        for i in 0..jsonb_array_length(search_json -> 'range') - 1 loop
            declare
                range_item jsonb := search_json -> 'range' -> i;
                column_name text := range_item ->> 'column';
            begin
                -- Handle only total_roq_unconstrained for HAVING clause
                if column_name = 'total_roq_unconstrained' then
                    if v_having_cls <> '' then
                        v_having_cls := v_having_cls || ' AND ';
                    end if;
                    v_having_cls := v_having_cls || global.form_table_query(jsonb_build_object('range', jsonb_build_array(range_item)));
                    -- Remove WHERE keyword and replace total_roq_unconstrained with its actual expression
                    v_having_cls := REPLACE(v_having_cls, 'WHERE ', '');
                    v_having_cls := REPLACE(v_having_cls, 'total_roq_unconstrained', 'SUM(oor.roq_unconstrained)');
                end if;
            end;
        end loop;
        -- Remove total_roq_unconstrained items from range array
        search_json := jsonb_set(search_json,'{range}',
        coalesce(
            (
                select jsonb_agg(item)
                from jsonb_array_elements(search_json -> 'range') as item
                where item ->> 'column' != 'total_roq_unconstrained'
            ),
        '[]'::jsonb
    ));
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
        -- Replace total_on_order with its actual expression for HAVING clause
        v_meta_cls := REPLACE(v_meta_cls, 'total_on_order', 'coalesce(opm.oo + opm.it,0)');
    END IF;

    -- Build the query
    v_query := 
    'SELECT
        oor.article,
        oor.order_group_id,
        oor.order_type,
        paf.vendor_desc,
        paf.l1_name,
        paf.l0_name,
        paf.l2_name,
        paf.l3_name,
        paf.l4_name,
		paf.style_name,
        created_details.name as created_by,
        oor.created_at,
        MAX(updated_details.name) as updated_by,
        MAX(oor.updated_at) as updated_at,
        SUM(COALESCE(oor.min_order_quantity_style,0)) as min_order_quantity,
        SUM(COALESCE(ootb.otb, 0)) AS otb,
        SUM(coalesce(oor.elt_projected_bop + elt_projected_store_inv,0)) AS total_store_inventory,
        SUM(oor.elt_projected_bop) AS total_dc_inventory,
        SUM(oor.elt_projected_store_inv) as elt_projected_store_inv,
		SUM(oor.elt_projected_bop) as elt_projected_bop,
        SUM(coalesce(oor.elt_projected_bop + oor.elt_projected_store_inv,0)) AS total_inventory,
        coalesce(SUM(opm.oo + opm.it),0) AS total_on_order,
        SUM(oor.elt_projected_safety_stock) AS elt_projected_safety_stock,
        SUM(oor.order_quantity) AS total_order_quantity,
        SUM(oor.unit_cost * oor.order_quantity) AS total_order_cost,
        SUM(oor.raw_roq) AS raw_roq,
        SUM(oor.roq_constrained) as total_roq_constrained,
        SUM(oor.roq_unconstrained) as total_roq_unconstrained,
        MIN(oor.order_placement_recom_date) as order_placement_recom_date,
        MIN(oor.editable_expected_receipt_date) as editable_expected_receipt_date,
        oor.order_status_id,
        ''View Order Info'' AS order_info,
        oor.order_gen_type
    FROM
        inventory_smart.oms_orders_recommended oor
    LEFT JOIN
        global.fiscal_date_mapping fdm ON fdm.calendar_date = oor.expected_receipt_date
    LEFT JOIN 
        global.user_master created_details ON created_details.user_code = oor.created_by
    LEFT JOIN 
        global.user_master updated_details ON updated_details.user_code = oor.updated_by
    LEFT JOIN
        inventory_smart.oms_kpi ok ON ok.product_code = oor.product_code and ok.loc_code = oor.loc_code
    LEFT JOIN
        inventory_smart.oms_otb ootb ON ootb.product_code = oor.product_code and ootb.loc_code = oor.loc_code and ootb.fiscal_year_week = oor.fiscal_year_week
     LEFT JOIN
        (SELECT product_code,loc_code,fiscal_year_week,sum(oo) as oo, sum(it) as it FROM inventory_smart.oms_po_master GROUP BY 1,2,3) opm
        ON opm.product_code = oor.product_code and opm.loc_code = oor.loc_code and opm.fiscal_year_week = fdm.fiscal_year_week
    ' || v_where || '
    ' || v_meta_cls || ' AND ' || v_choice_filter || '
    ' || COALESCE('AND ' || v_time_filter, '') ||'
    GROUP BY
        oor.article,
        oor.order_group_id,
        oor.order_type,
        paf.vendor_desc,
        paf.l1_name,
		paf.style_name,
        paf.l0_name,
        paf.l2_name,
        paf.l3_name,
        paf.l4_name,
        oor.order_status_id,
        oor.order_gen_type,
        created_details.name,
        oor.created_at
        '|| COALESCE(NULLIF('HAVING ' || v_having_cls, 'HAVING '), '') ||'
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
