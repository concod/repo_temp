--liquibase formatted sql
--changeset adesh:details_metric_v1 runOnChange:true stripComments:false splitStatements:false context:MTP-122243 labels:MTP-122243
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
    product_attributes := product_attributes || jsonb_build_object('channel', store_attributes->>'channel');
    _query_pa := inventory_smart.form_main_table_filters('ph_master', product_attributes);
    _query_sa := global.form_main_table_filters('store_attributes_filter', store_attributes);
	if length(_query_sa) = 0 then
        _query_sa := ' WHERE TRUE';
    end if;
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
    AND article NOT IN (select article FROM inventory_smart.alerts_product_level where new_choice_flag = 1)
    group by 1
 )	
 , store_code_cte as (
	select store_code from "global".store_attributes_filter saf
	%s
	and upper(saf.store_category) = 'STORE'
)
			,art_inv_dash_store AS
             (
  		SELECT  aid.* FROM inventory_smart.article_inventory_dashboard aid
        join store_code_cte using(store_code)
        join product_codes_cte pcc using(article)
  ),str_metrics AS
			(
			SELECT
				article,
				CAST(ROUND(SUM(COALESCE(l1w_sales, 0))) AS INTEGER) AS l1w_sales,
				CAST(ROUND(SUM(COALESCE(l2w_sales, 0))) AS INTEGER) AS l2w_sales,
				CAST(ROUND(SUM(COALESCE(l3w_sales, 0))) AS INTEGER) AS l3w_sales,
				CAST(ROUND(SUM(COALESCE(l4w_sales, 0))) AS INTEGER) AS l4w_sales,
				CAST(ROUND(SUM(COALESCE(l5w_sales, 0))) AS INTEGER) AS l5w_sales,
				CAST(ROUND(SUM(COALESCE(l6w_sales, 0))) AS INTEGER) AS l6w_sales,
				CAST(ROUND(SUM(COALESCE(l7w_sales, 0))) AS INTEGER) AS l7w_sales,
				CAST(ROUND(SUM(COALESCE(l8w_sales, 0))) AS INTEGER) AS l8w_sales,
				CAST(ROUND(SUM(COALESCE(oh, 0))) AS INTEGER) AS store_oh,
				CAST(ROUND(SUM(COALESCE(oo, 0))) AS INTEGER) AS store_oo,
				CAST(ROUND(SUM(COALESCE(it, 0))) AS INTEGER) AS store_it,
				MIN(tot_inv) AS min_oh,
				MAX(tot_inv) AS max_oh,
				PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY tot_inv) AS percentile_25_oh,
				PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY tot_inv) AS median_oh,
				PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY tot_inv) AS percentile_75_oh




			FROM
				art_inv_dash_store
			GROUP BY
				article
		)
  		SELECT
                                article ,
                                l6_name ,
                                color ,
                                l0_name ,
                                l2_name ,
                                l3_name ,
                                l4_name ,
                                l5_name ,
                                collection ,
                                masterstyle_descr ,
                                subbrand_code_desc ,
                                product_lifecycle ,
                                current_floorset ,
                                current_assortment_group ,
                                flex_style ,
                                generic ,
                                sizes_mat ,
                                form ,
                                user_defined_1 ,
                                user_defined_2 ,
                                user_defined_3 ,
                                user_defined_4 ,
                                user_defined_5 ,
                                user_defined_6 ,
                                choice_status AS product_tag,
                                SUM(COALESCE(oh, 0)) AS store_oh,
                                SUM(COALESCE(it, 0)) AS store_it,
                                SUM(COALESCE(oo, 0)) AS store_oo,
                                SUM(COALESCE(wip, 0)) AS wip,
                                SUM(COALESCE(initial_oh, 0)) AS initial_oh,
                                SUM(COALESCE(rfid_delta, 0)) AS rfid_delta,
                                SUM(COALESCE(epc_units, 0)) AS epc_units,
                                SUM(COALESCE(store_reserve, 0)) AS store_reserve,
                                CAST(ROUND(SUM(COALESCE(tot_inv, 0))) AS INTEGER) AS total_inv,
                                CAST(ROUND(SUM(COALESCE(last_week_sales, 0))) AS INTEGER) AS last_week_sales,
                                CAST(ROUND(SUM(COALESCE(l4w_avg_sales, 0))) AS INTEGER) AS l4w_avg_sales,
                                CAST(ROUND(SUM(COALESCE(l8w_avg_sales, 0))) AS INTEGER) AS l8w_avg_sales,
                                CAST(ROUND(SUM(COALESCE(week_to_date_sales, 0))) AS INTEGER) AS week_to_date_sales,
                                CAST(ROUND(SUM(COALESCE(last_week_revenue, 0))) AS INTEGER) AS last_week_revenue,
                                CAST(ROUND(SUM(COALESCE(last_week_margin, 0))) AS INTEGER) AS last_week_margin,
                                COALESCE(ROUND(AVG(last_week_margin_percentage)::NUMERIC,2),0)  AS last_week_margin_percentage,
                                COALESCE(ROUND(AVG(promo_percentage)::NUMERIC, 2),0)  AS promo_percentage,
                                COALESCE(ROUND(AVG(forward_wos)::NUMERIC, 2),0)  AS forward_wos,
                                TRIM(TRAILING '.' FROM TRIM(TRAILING '0' FROM COALESCE(ROUND(AVG(forward_wos)::numeric, 2), 0)::TEXT)) || ',' ||
                                TRIM(TRAILING '.' FROM TRIM(TRAILING '0' FROM COALESCE(ROUND(AVG(twos)::numeric, 2), 0)::TEXT)) AS cwos,	
                                COALESCE(ROUND(AVG(size_integrity_oh)::NUMERIC, 2),0)  AS size_integrity_oh,
                                COALESCE(ROUND(AVG(size_integrity_oh_oo_it)::NUMERIC, 2),0)  AS size_integrity_oh_oo_it,
                                COALESCE(ROUND(AVG(aur)::NUMERIC, 2),0) AS aur,
                                SUM(COALESCE(excess, 0)) AS excess,
                                SUM(COALESCE(normal, 0)) AS normal,
                                SUM(COALESCE(shortfall, 0)) AS shortfall,
                                CAST(ROUND(SUM(COALESCE(stockout, 0))) AS INTEGER) AS stockout,
                                CAST(ROUND(SUM(COALESCE(forecast_over_target_wos, 0))) AS INTEGER) AS forecast_over_target_wos,
                                CAST(ROUND(SUM(COALESCE(current_week_forecast, 0))) AS INTEGER) AS current_week_forecast,
                                CAST(ROUND(SUM(COALESCE(next_4_week_forecast, 0))) AS INTEGER) AS next_4_weeks_forecast,
                                CAST(ROUND(SUM(COALESCE(next_8_week_forecast, 0))) AS INTEGER) AS next_8_weeks_forecast,
                                CAST(ROUND(AVG(COALESCE(oh_dc,0))) AS INTEGER) AS dc_oh,
                                CAST(ROUND(AVG(COALESCE(oo_dc,0))) AS INTEGER) AS dc_oo,
                                CAST(ROUND(AVG(COALESCE(it_dc,0))) AS INTEGER) AS dc_it,
                                (
                                    SUM(COALESCE(aid.l1w_sales, 0)) + 
                                    SUM(COALESCE(aid.l2w_sales, 0)) + 
                                    SUM(COALESCE(aid.l3w_sales, 0))+ 
                                    SUM(COALESCE(aid.l4w_sales, 0)) + 
                                    SUM(COALESCE(aid.l5w_sales, 0))+ 
                                    SUM(COALESCE(aid.l6w_sales, 0))+ 
                                    SUM(COALESCE(aid.l7w_sales, 0))+ 
                                    SUM(COALESCE(aid.l8w_sales, 0))
                                )::TEXT || '|' ||
								SUM(COALESCE(aid.l8w_sales,0))::TEXT || ',' ||
								SUM(COALESCE(aid.l7w_sales, 0))::TEXT || ',' ||
								SUM(COALESCE(aid.l6w_sales, 0))::TEXT || ',' ||
								SUM(COALESCE(aid.l5w_sales, 0))::TEXT || ',' ||
								SUM(COALESCE(aid.l4w_sales, 0))::TEXT || ',' ||
								SUM(COALESCE(aid.l3w_sales, 0))::TEXT || ',' ||
								SUM(COALESCE(aid.l2w_sales, 0))::TEXT || ',' ||
								SUM(COALESCE(aid.l1w_sales, 0))::TEXT AS sales_last_8_weeks,
								ARRAY[
								    MAX(COALESCE(str_metrics.min_oh, 0)),
								    MAX(COALESCE(str_metrics.percentile_25_oh, 0)),
								    MAX(COALESCE(str_metrics.median_oh, 0)),
									MAX(COALESCE(str_metrics.percentile_75_oh, 0)),
								    MAX(COALESCE(str_metrics.max_oh, 0))
								] AS snapshot,                                
                                CAST(ROUND(SUM(COALESCE(week_to_date_sales, 0))) AS TEXT) || '|' ||
                                CAST(ROUND(SUM(COALESCE(last_week_sales, 0))) AS TEXT) || ',' ||
                                CAST(ROUND(SUM(COALESCE(week_to_date_sales, 0))) AS TEXT) AS sales_cw_vs_lw
                                %s

                        FROM art_inv_dash_store aid
                        join str_metrics using(article)
                        join product_codes_cte using(article)
                        
                        GROUP BY
                                article ,
                                l6_name ,
                                color ,
                                l0_name ,
                                l2_name ,
                                l3_name ,
                                l4_name ,
                                l5_name ,
                                collection ,
                                masterstyle_descr ,
                                subbrand_code_desc ,
                                product_lifecycle ,
                                current_floorset ,
                                current_assortment_group ,
                                flex_style ,
                                generic ,
                                sizes_mat ,
                                form ,
                                user_defined_1 ,
                                user_defined_2 ,
                                user_defined_3 ,
                                user_defined_4 ,
                                user_defined_5 ,
                                user_defined_6 ,
                                choice_status 
                				
	$$, _query_pa, _query_sa, _dynamic_kpi_columns);
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
