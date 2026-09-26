--liquibase formatted sql
--changeset mssprkash.yashwanth@impactanalytics.co:get_oms_store_order_details_summary_listv14 runOnChange:true stripComments:false splitStatements:false context:MTP-114893 labels:MTP-114893
--comment: color code flag updated to avg(min_order_quantity_style)
--rollback: SELECT 1

DROP FUNCTION IF EXISTS inventory_smart.get_oms_store_order_details_summary_list(refcursor, jsonb, jsonb, text, text, text, text);
CREATE OR REPLACE FUNCTION inventory_smart.get_oms_store_order_details_summary_list(input refcursor, product_filter jsonb, meta jsonb, styles text, months text, fiscal_weeks text, store_filter text)
 RETURNS refcursor
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_choice_filter text := '';
    v_time_filter text := '';
    v_meta_cls text := '';
    v_query text := '';
    v_where text := '';
    v_pa_sql text := '';
    v_sa_sql text := '';
    v_limit_cls text := '';
    v_search_cls text := '';
    v_sort_cls text := '';
    limit_json jsonb := '{}';
    search_json jsonb:= '{}'; 
    sort_json jsonb := '{}';
    v_sa_query text := '';
    default_sort text := ' ORDER BY order_placement_recom_date ASC, oors.article DESC, oors.order_group_id ASC ';
BEGIN
    -- Form product attributes filter query

    v_pa_sql := inventory_smart.form_main_table_filters(
        'product_attributes_filter',
        $2
    );

    v_sa_sql := COALESCE(
        regexp_replace(
            COALESCE(inventory_smart.form_main_table_filters('oors', $7::jsonb), ''),
            '^\s*where\s+',
            ' AND ',
            'i'
        ),
        ''
    );

    -- Generate Choice filter dynamically
    IF styles IS NOT NULL AND styles <> '' AND styles <> '[]' THEN
        v_choice_filter := 'oors.article IN (' || styles || ')';
    ELSE
        v_choice_filter := '0=1'; -- No Choice filter applied if the array is empty
    END IF;

    -- Generate month and fiscal month filter
    IF (months IS NOT NULL AND months <> '') OR (fiscal_weeks IS NOT NULL AND fiscal_weeks <> '') THEN
        v_time_filter := '(';
        IF months IS NOT NULL AND months <> '' THEN
            v_time_filter := v_time_filter || 'oors.month IN (' || upper(months) || ')';
        END IF;
        IF fiscal_weeks IS NOT NULL AND fiscal_weeks <> '' THEN
            IF months IS NOT NULL AND months <> '' THEN
                v_time_filter := v_time_filter || ' OR ';
            END IF;
            v_time_filter := v_time_filter || 'oors.fiscal_year_week IN (' || fiscal_weeks || ')';
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
        v_sort_cls := REPLACE(v_sort_cls, 'order_status_id', 'order_status');
     end if;

    -- Generate meta conditions dynamically if provided
    IF meta <> '{}' THEN
        v_meta_cls := global.form_table_query(search_json);
         --v_meta_cls := REPLACE(v_meta_cls, 'article', 'paf.article');
    END IF;

    -- Build the query
    v_query := 
    'WITH filtered_oors AS (
        SELECT oors.*
        FROM inventory_smart.oms_orders_recommended_store oors
        ' || v_pa_sql || '
        ' || v_sa_sql || '
    ),
    opm as (
        select product_code,store_code,fiscal_year_week,sum(oo)oo,sum(it)it
        from inventory_smart.oms_po_master_store opms 
        group by 1,2,3
    ),
	final_output_result as (
        SELECT
        oors.article,
        oors.order_type,
        oors.order_group_id,
        l6_name,
        l2_name,
        l3_name,
        l1_name,
        l5_name,
        l0_name,
        style_name,
		oors.order_type,
		oors.vendor_name,
		oors.order_placement_date,
       	min(oors.expected_receipt_date) AS expected_receipt_date,
       	min(oors.editable_expected_receipt_date) AS editable_expected_receipt_date,
        COALESCE(sum(opm.oo ), 0) as oo,
        SUM(oors.order_quantity) AS order_quantity,
        SUM(oors.order_quantity_eaches) AS order_quantity_eaches,
        SUM(oors.raw_roq) AS raw_roq,
		SUM(oors.elt_projected_store_inv) AS elt_projected_store_inv,
        SUM(oors.elt_projected_safety_stock) AS elt_projected_safety_stock,
        SUM(oors.elt_sales_forecast_twos) AS elt_sales_forecast_twos,
        avg(oors.min_order_quantity_style) AS min_order_quantity_style,
        SUM(oors.ia_shipment_order_quantity) AS ia_shipment_order_quantity,
        SUM(oors.order_cost) AS order_cost,
        CASE 
            WHEN SUM(oors.order_cost) = 0 OR SUM(oors.order_quantity_eaches) = 0 THEN 0
            ELSE SUM(oors.order_cost)/SUM(oors.order_quantity_eaches)
        END AS landing_cost,
        max(oors.editable_effective_lead_time) AS editable_effective_lead_time,
        SUM(oors.raw_roq) AS raw_roq,
        SUM(oors.roq_constrained) as roq_constrained,
        SUM(oors.roq_unconstrained) as roq_unconstrained,
        CASE 
                WHEN oors.order_status_id in (1,-1,3) THEN 2 --grey
                WHEN SUM(oors.raw_roq) > 0
                    AND SUM(oors.roq_unconstrained) = 0
                    AND SUM(oors.order_quantity) = 0
                THEN 3 -- blue
                WHEN COALESCE(avg(oors.min_order_quantity_style), 0) > COALESCE(sum(oors.order_quantity), 0) THEN 4 --red
                ELSE 0
            END AS flag,
        order_status_id,
        CASE order_status_id
		    WHEN 0 THEN ''Recommended''
		    WHEN 1 THEN ''Pending Order''
		    WHEN -1 THEN ''Order Under Review''
		    WHEN 3 THEN ''Approved''
		    ELSE ''Unknown''
		END AS order_status
		
    FROM
        filtered_oors oors
        LEFT JOIN
        	opm ON opm.product_code = oors.product_code and opm.fiscal_year_week = oors.fiscal_year_week and opm.store_code = oors.store_code
        WHERE ' || COALESCE( v_time_filter, '') ||'
        GROUP BY
            oors.article,
            oors.order_group_id,
            oors.order_type,
            l6_name,
            l2_name,
            l3_name,
            l1_name,
            l5_name,
            l0_name,
            style_name,
            min_order_quantity_style,
    		oors.vendor_name,
            oors.order_status_id,
    		oors.order_placement_date' || 
            CASE 
                WHEN v_sort_cls IS NULL OR v_sort_cls = '' THEN 
                    ', oors.order_placement_recom_date'
                ELSE 
                    ''
            END || '
            '|| COALESCE(NULLIF(v_sort_cls, ''), default_sort) ||')
			select * from final_output_result' || v_meta_cls || ' ' || v_limit_cls || ' '
;

    -- Log the query for debugging
    RAISE NOTICE 'Executing query: %', v_query;

    -- Execute the query and open the refcursor
    OPEN input FOR EXECUTE v_query;

    -- Return the refcursor
    RETURN input;
END;
$function$
;

