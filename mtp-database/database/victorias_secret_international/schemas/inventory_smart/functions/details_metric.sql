--liquibase formatted sql
--changeset liquibase:details_metric_v1 runOnChange:true stripComments:false splitStatements:false context:MTP-122243 labels:MTP-122243
--comment: MTP-122243 dynamic KPI columns support
--rollback: SELECT 1
DROP FUNCTION IF EXISTS inventory_smart.details_metric(input refcursor, jsonb, jsonb, jsonb);
DROP FUNCTION IF EXISTS inventory_smart.details_metric(refcursor, jsonb, jsonb, jsonb, jsonb);
CREATE OR REPLACE FUNCTION inventory_smart.details_metric(input refcursor, product_attributes jsonb, store_attributes jsonb, table_filters jsonb, dynamic_kpi_config jsonb DEFAULT '[]'::jsonb)
 RETURNS refcursor
 LANGUAGE plpgsql
AS $function$
DECLARE
    _query_pa TEXT := '';
    _query_sa TEXT := '';
    _query_pa_sa TEXT := '';
    _query_table_filters TEXT := '';
    _query_combine TEXT := '';
    _channel TEXT := inventory_smart.get_channel_FROM_input(store_attributes);
    _cache_payload JSONB := jsonb_build_object('product_attributes', product_attributes, 'store_attributes', store_attributes);
    _cache_table_id TEXT;
    _cache_schema TEXT := 'inventory_smart';
    _cache_sp TEXT := '.details_metric';
    _cache_key_pattern TEXT := '{schema_name}:{sp_name}:{request}';
    _cache_dependencies TEXT[] := ARRAY['inventory_smart.article_inventory_dashboard', 'inventory_smart.article_allocation_tracker'];
    v_gen_random_uuid text  := gen_random_uuid()::varchar;
    -- Dynamic KPI variables
    _dynamic_kpi_columns TEXT := '';
    _kpi_name TEXT;
BEGIN
    RAISE NOTICE '%', store_attributes->>'channel';
    _query_pa := inventory_smart.form_main_table_filters('ph_master', product_attributes);
    _query_sa := global.form_main_table_filters('store_attributes_filter', store_attributes);
    _query_pa_sa := _query_pa || 
                    (CASE WHEN LENGTH(_query_sa) > 0 THEN
                      ' AND ' || SUBSTRING(_query_sa, 8)
                     ELSE '' END);
    _query_pa_sa := COALESCE(NULLIF(_query_pa_sa, ''), ' WHERE TRUE');
    RAISE NOTICE 'Combined product store attribute query --> %', _query_pa_sa; 
    _query_table_filters := global.form_table_query(table_filters);
    RAISE NOTICE 'Query filter table --> %', _query_table_filters;

    -- Build dynamic KPI columns from the passed dynamic_kpi_config parameter
    -- Expected format: ["kpi_name_1", "kpi_name_2", ...] - array of KPI names (column names)
    IF dynamic_kpi_config IS NOT NULL AND jsonb_array_length(dynamic_kpi_config) > 0 THEN
        FOR _kpi_name IN SELECT jsonb_array_elements_text(dynamic_kpi_config)
        LOOP
            _dynamic_kpi_columns := _dynamic_kpi_columns || ', ' || quote_ident(_kpi_name);
        END LOOP;
    END IF;
    RAISE NOTICE 'Dynamic KPI columns --> %', _dynamic_kpi_columns;

    -- Update cache payload to include dynamic KPI config for proper cache differentiation
    _cache_payload := _cache_payload || jsonb_build_object('dynamic_kpi_config', dynamic_kpi_config);

       _query_combine := FORMAT($$
			with product_codes_cte as (
    select article
    from inventory_smart.ph_master pm
    %s
    group by 1
 )	
			,art_inv_dash_store AS
             (
  		SELECT  aid.* FROM inventory_smart.article_inventory_dashboard aid
        join "global".store_attributes_filter saf using(store_code)
        join product_codes_cte pcc using(article)
        where upper(saf.store_category) = 'STORE'
  )
  		SELECT
                                article,
                                l7_name,
                                color,
                                l0_name,
                                l3_name,
                                l4_name,
                                l5_name,
                                l6_name,
                                collection,
                                masterstyle_descr,
                                subbrand_code_desc,
                                product_lifecycle,
                                current_floorset,
                                current_assortment_group,
                                flex_style,
                                generic,
                                sizes_mat,
                                form,
                                user_defined_1,
                                user_defined_2,
                                user_defined_3,
                                user_defined_4,
                                user_defined_5,
                                choice_status,
                                SUM(COALESCE(oh, 0)) AS store_oh,
                                SUM(COALESCE(it, 0)) AS store_it,
                                SUM(COALESCE(oo, 0)) AS store_oo,
                                SUM(COALESCE(wip, 0)) AS wip,
                                SUM(COALESCE(initial_oh, 0)) AS initial_oh,
                                SUM(COALESCE(rfid_delta, 0)) AS rfid_delta,
                                SUM(COALESCE(epc_units, 0)) AS epc_units,
                                CAST(ROUND(SUM(COALESCE(tot_inv, 0))) AS INTEGER) AS total_inv,
                                SUM(COALESCE(r_site_oh, 0)) AS r_site_oh,
                                SUM(COALESCE(r_site_oo, 0)) AS r_site_oo,
                                SUM(COALESCE(r_site_it, 0)) AS r_site_it,
                                SUM(COALESCE(r_site_wip, 0)) AS r_site_wip,
                                SUM(COALESCE(r_site_total_inv, 0)) AS r_site_total_inv,
                                SUM(COALESCE(l_site_oh, 0)) AS l_site_oh,
                                SUM(COALESCE(l_site_oo, 0)) AS l_site_oo,
                                SUM(COALESCE(l_site_it, 0)) AS l_site_it,
                                SUM(COALESCE(l_site_wip, 0)) AS l_site_wip,
                                SUM(COALESCE(l_site_total_inv, 0)) AS l_site_total_inv,
                                CAST(ROUND(SUM(COALESCE(last_week_sales, 0))) AS INTEGER) AS last_week_sales,
                                CAST(ROUND(SUM(COALESCE(l4w_avg_sales, 0))) AS INTEGER) AS l4w_avg_sales,
                                CAST(ROUND(SUM(COALESCE(l12w_avg_sales, 0))) AS INTEGER) AS l12w_avg_sales,
                                CAST(ROUND(SUM(COALESCE(week_to_date_sales, 0))) AS INTEGER) AS week_to_date_sales,
                                CAST(ROUND(SUM(COALESCE(last_week_revenue, 0))) AS INTEGER) AS last_week_revenue,
                                CAST(ROUND(AVG(COALESCE(store_forward_wos,0))) AS INTEGER) AS store_forward_wos,
                                CAST(ROUND(AVG(COALESCE(r_site_forward_wos,0))) AS INTEGER) AS r_site_forward_wos,
                                CAST(ROUND(AVG(COALESCE(size_integrity_oh,0))) AS INTEGER) AS size_integrity_oh,
                                CAST(ROUND(AVG(COALESCE(size_integrity_oh_oo_it,0))) AS INTEGER) AS size_integrity_oh_oo_it,
                                CAST(ROUND(AVG(COALESCE(aur,0))) AS INTEGER) AS aur,
                                SUM(COALESCE(excess, 0)) AS excess,
                                SUM(COALESCE(normal, 0)) AS normal,
                                SUM(COALESCE(shortfall, 0)) AS shortfall,
                                SUM(COALESCE(stockout, 0)) AS stockout,
                                CAST(ROUND(AVG(COALESCE(oh_dc,0))) AS INTEGER) AS oh_dc,
                                CAST(ROUND(AVG(COALESCE(oo_it_dc,0))) AS INTEGER) AS oo_it_dc,
                                CAST(ROUND(SUM(COALESCE(current_week_forecast, 0))) AS INTEGER) AS current_week_forecast,
                                CAST(ROUND(SUM(COALESCE(next_4_week_forecast, 0))) AS INTEGER) AS next_4_week_forecast,
                                CAST(ROUND(SUM(COALESCE(next_8_week_forecast, 0))) AS INTEGER) AS next_8_week_forecast,
                                CAST(ROUND(SUM(COALESCE(next_20_week_forecast, 0))) AS INTEGER) AS next_20_week_forecast
                                %s                                
                        FROM art_inv_dash_store
                        join product_codes_cte using(article)
                        %s
                        GROUP BY
                               article,
                                l7_name,
                                color,
                                l0_name,
                                l3_name,
                                l4_name,
                                l5_name,
                                l6_name,
                                collection,
                                masterstyle_descr,
                                subbrand_code_desc,
                                product_lifecycle,
                                current_floorset,
                                current_assortment_group,
                                flex_style,
                                generic,
                                sizes_mat,
                                form,
                                user_defined_1,
                                user_defined_2,
                                user_defined_3,
                                user_defined_4,
                                user_defined_5,
                                choice_status 
                				
	$$, _query_pa, _dynamic_kpi_columns, _query_sa);
	RAISE NOTICE 'Constructed SQL: -->  %', _query_combine;

    SELECT
        * 
    INTO
        _cache_table_id
    FROM 
        cache.wrap_sp(
            _cache_schema,
            _cache_sp, 
            _cache_payload, 
            _query_combine, 
            _cache_dependencies, 
            _cache_key_pattern
        );

    PERFORM set_config('myvars.cache_table_id', _cache_table_id, true);

    OPEN input FOR EXECUTE 'SELECT * FROM "cache"."' || _cache_table_id || '" ' || _query_table_filters;

	perform  global.sp_log(v_gen_random_uuid,'inventory_smart.details_metric', 'Before RETURN','SELECT * FROM "cache"."' || _cache_table_id || '" ' || _query_table_filters,jsonb_build_object('product_attributes', $2, 'store_attributes', $3, 'table_filters',$4,'dynamic_kpi_config',dynamic_kpi_config));

    RETURN input;
END
$function$
;
