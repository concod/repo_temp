--liquibase formatted sql
--changeset chandranil.ghosh:get_oms_approval_pane_data_from_style_order_data_vs_1 runOnChange:true stripComments:false splitStatements:false context:MTP-57372 labels:get_oms_approval_pane_data_from_style_order_data_vs_1
--comment: Added SP for OMS approval pane data from style order data
--rollback: SELECT 1


DROP FUNCTION IF EXISTS inventory_smart.get_oms_approval_pane_data_from_style_order_data(jsonb, jsonb, text, text, text);

CREATE OR REPLACE FUNCTION inventory_smart.get_oms_approval_pane_data_from_style_order_data(product_filter jsonb, meta jsonb, styles text, months text, fiscal_weeks text)
 RETURNS TABLE(order_group_id character varying)
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_style_filter text := '';
    v_time_filter text := '';
    v_meta_cls text := '';
    v_query text := '';
    v_where text := '';
    v_pa_query text := '';
    v_search_cls text := '';
    v_sort_cls text := '';
    v_limit_cls text := '';
    limit_json jsonb := '{}';
    search_json jsonb:= '{}'; 
    sort_json jsonb := '{}';
    v_oaf_join_conditions text := '';
BEGIN
    -- Form product attributes filter query
    v_pa_query := global.form_main_table_filters('product_attributes_filter', product_filter);
    RAISE NOTICE 'v_pa_query: %', v_pa_query;

    -- Add product attributes filter join
    v_where := 'JOIN (SELECT * FROM global.product_attributes_filter ' || v_pa_query || ') paf ON paf.product_code = oor.product_code';
    v_oaf_join_conditions := ' LEFT JOIN inventory_smart.oms_total_dc_forecast oaf ON oaf.product_code = oor.product_code and oaf.loc_code = oor.loc_code and oaf.fiscal_year_week = oor.fiscal_year_week';


    -- Generate style filter dynamically
    IF styles IS NOT NULL THEN
        v_style_filter := 'paf.article IN (' || styles || ')';
    ELSE
        v_style_filter := '0=1'; -- No style filter applied if the array is empty
    END IF;

    -- Generate month and fiscal week filter
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

    -- Handle search and sort
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
    END IF;

    -- Build the query
    v_query := 
    'SELECT
        oor.order_group_id
    FROM
        inventory_smart.oms_orders_recommended oor
    LEFT JOIN
        inventory_smart.oms_kpi ok ON ok.product_code = oor.product_code and ok.loc_code = oor.loc_code
    ' || v_where || '
    '  || v_oaf_join_conditions || '
    ' || v_meta_cls || ' AND ' || v_style_filter || '
    ' || COALESCE('AND ' || v_time_filter, '') ||' 
    GROUP BY
        paf.article,
        oor.order_group_id,
        paf.l0_name,
        paf.l2_name,
        paf.l3_name,
        paf.l4_name,
        paf.product_lifecycle,
        oor.order_status_id
        '|| v_sort_cls ||'';

    -- Log the query for debugging
    RAISE NOTICE 'Executing query: %', v_query;

    -- Return the result set
    RETURN QUERY EXECUTE v_query;
END;
$function$
;
