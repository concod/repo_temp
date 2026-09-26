--liquibase formatted sql
--changeset imrankhan:details_metric runOnChange:true stripComments:false splitStatements:false context:MTP-125273 labels:MTP-125273
--comment: MTP-125273 last_week_margin_percentage added
--rollback: SELECT 1
DROP FUNCTION IF EXISTS inventory_smart.details_metric(refcursor, jsonb, jsonb, jsonb,jsonb);
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
    _query_pa := inventory_smart.form_main_table_filters('product_attributes_filter', product_attributes);
    _query_sa := global.form_main_table_filters('store_attributes_filter', store_attributes);
    _query_pa_sa := _query_pa || 
                    (CASE WHEN LENGTH(_query_sa) > 0 THEN
                      ' AND ' || SUBSTRING(_query_sa, 8)
                     ELSE '' END);
    _query_pa_sa := COALESCE(NULLIF(_query_pa_sa, ''), ' WHERE TRUE');
    _query_sa := COALESCE(NULLIF(_query_sa, ''), ' WHERE TRUE');
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
			WITH filtered_articles as materialized (
        SELECT article
        FROM global.product_attributes_filter
            %s)
                    ,product_codes_cte as materialized (
            SELECT DISTINCT pm.article, article_orig
        FROM inventory_smart.ph_master pm
        JOIN filtered_articles paf ON pm.article = paf.article
        )
        ,tenant_timezone as materialized (
			SELECT attribute_value::json->'value'->>'time_zone' AS tz
			FROM global.tenant_attribute_master
			WHERE name = 'tenant_time_config'
			LIMIT 1
			)
			,gurobi_data as materialized (
			SELECT
				carfg.article,
				MAX(carfg.created_at::date) AS last_allocation_date
			FROM inventory_smart.plan_master pm
			JOIN inventory_smart.create_allocation_result_flat_gurobi carfg
				ON carfg.allocation_code = pm.plan_code
			CROSS JOIN tenant_timezone tz
			WHERE
				carfg.created_at >= (now() AT TIME ZONE tz.tz)::date AT TIME ZONE tz.tz
				AND carfg.created_at  < ((now() AT TIME ZONE tz.tz)::date AT TIME ZONE tz.tz + INTERVAL '1 day')
				AND (pm.created_at AT TIME ZONE tz.tz)::date = (now() AT TIME ZONE tz.tz)::date
				AND pm.status IN (2, 3)
			GROUP BY carfg.article
			)
			,art_inv_dash_store as materialized (
  		SELECT  aid.*, pcc.article_orig,
        COALESCE(
      					TO_CHAR(gd.last_allocation_date, 'YYYY-MM-DD'),
      					TO_CHAR(ladt.last_allocation_date, 'YYYY-MM-DD')
    					)
  						last_allocation_date
        FROM inventory_smart.article_inventory_dashboard aid
        join "global".store_attributes_filter saf using(store_code)
        join product_codes_cte pcc using(article)
        LEFT JOIN gurobi_data gd using(article)
        left join inventory_smart.last_allocation_date_table ladt using(article)
        %s
        and dc_flag=false
  )
  		SELECT
                                l0_name ,
                                l1_name ,
                                l2_name ,
                                l3_name ,
                                l4_name ,
                                l5_name ,
                                l6_name ,
                                l7_name ,
                                l8_name ,
                                article_orig ,
                                article,
                                style_id ,
                                color_code ,
                                style_desc ,
                                assortment_indicator ,
                                factory_type ,
                                intro_date ,
                                article_status_tag ,
                                last_allocation_date,
                                product_reach_desc,
								store_group,
                                AVG(COALESCE(size_integrity,0)) as size_integrity,
                                AVG(COALESCE(sell_through_perc,0)) as sell_through_perc,
                                SUM(COALESCE(lw_sales_units,0)) AS lw_sales_units,
                                SUM(COALESCE(wtd_sales_units,0)) AS wtd_sales_units,
                                ROUND(AVG(COALESCE(dc_oh,0)),0) AS dc_oh,
                                ROUND(AVG(COALESCE(dc_las_vegas_oh,0)),0) AS dc_las_vegas_oh,
                                ROUND(AVG(COALESCE(dc_las_vegas_it,0)),0) AS dc_las_vegas_it,
                                ROUND(AVG(COALESCE(dc_canada_ccls_oh,0)),0) AS dc_canada_ccls_oh,
                                ROUND(AVG(COALESCE(dc_canada_ccls_it,0)),0) AS dc_canada_ccls_it,
                                ROUND(AVG(COALESCE(dc_jax_oh,0)),0) AS dc_jax_oh,
                                ROUND(AVG(COALESCE(dc_jax_it,0)),0) AS dc_jax_it,
                                ROUND(AVG(COALESCE(dc_ohio_oh,0)),0) AS dc_ohio_oh,
                                ROUND(AVG(COALESCE(dc_ohio_it,0)),0) AS dc_ohio_it,
                                ROUND(AVG(COALESCE(dc_reynosa_oh,0)),0) AS dc_reynosa_oh,
                                ROUND(AVG(COALESCE(dc_reynosa_it,0)),0) AS dc_reynosa_it,
                                ROUND(AVG(COALESCE(dc_canada_oh,0)),0) AS dc_canada_oh,
                                ROUND(AVG(COALESCE(dc_canada_it,0)),0) AS dc_canada_it,
                                SUM(COALESCE(store_oh_it_oo, 0)) AS store_oh_it_oo,
                                SUM(COALESCE(lw_margin_perc,0)) AS lw_margin_perc,
                                COALESCE(ROUND(AVG(lw_margin_perc)::NUMERIC,2),0) / 100 AS last_week_margin_percentage,
                                SUM(COALESCE(lw_revenue,0)) AS lw_revenue,
                                AVG(COALESCE(wos_oh,0)) AS wos_oh,
                                SUM(COALESCE(store_oh,0)) AS store_oh,
                                SUM(COALESCE(store_oo,0)) AS store_oo,
                                SUM(COALESCE(store_it,0)) AS store_it,
                                SUM(COALESCE(store_oh_it,0)) AS store_oh_it,
                                SUM(COALESCE(stockout,0)) AS stockout,
                                SUM(COALESCE(excess, 0)) AS excess,
                                SUM(COALESCE(normal, 0)) AS normal,
                                SUM(COALESCE(shortfall, 0)) AS shortfall,
                                AVG(COALESCE(lw_promo,0)) AS lw_promo,
                                SUM(COALESCE(lw_revenue,0)) / NULLIF(SUM(COALESCE(lw_sales_units,0)), 0) AS lw_aur,
                                SUM(COALESCE(wtd_revenue,0)) AS wtd_revenue,
                                SUM(COALESCE(wtd_margin,0)) AS wtd_margin,
                                AVG(COALESCE(wtd_promo,0)) AS wtd_promo,
                                SUM(COALESCE(wtd_revenue,0)) / NULLIF(SUM(COALESCE(wtd_sales_units,0)), 0) AS wtd_aur,
                                ROUND(AVG(COALESCE(dc_it,0)),0) AS dc_it,
	                            ROUND(AVG(coalesce(in_stock_perc, 0))::numeric, 2) as in_stock_perc,
                                ROUND(AVG(COALESCE(avg_discount,0))::numeric, 2) AS promo,
                                TRIM(TRAILING '.' FROM TRIM(TRAILING '0' FROM ROUND(AVG(wos_oh_oo_it)::numeric, 2)::TEXT))
                                    || ',' ||
                                    TRIM(TRAILING '.' FROM TRIM(TRAILING '0' FROM ROUND(AVG(wos_targeted)::numeric, 2)::TEXT)) AS cwos,
                                SUM(COALESCE(wtd_sales_units, 0))::TEXT || '|' ||
                                SUM(COALESCE(lw_sales_units, 0))::TEXT || ',' ||
                                SUM(COALESCE(wtd_sales_units, 0))::TEXT AS sales_cw_vs_lw,
                                ARRAY[
                                    COALESCE(MIN(store_oh_it_oo), 0),
                                    COALESCE(PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY store_oh_it_oo), 0),
                                    COALESCE(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY store_oh_it_oo), 0),
                                    COALESCE(PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY store_oh_it_oo), 0),
                                    COALESCE(MAX(store_oh_it_oo), 0)
                                ] AS snapshot,
                                (
                                    SUM(COALESCE(lw_sales_units, 0)) + 
                                    SUM(COALESCE(l2w_sales, 0)) + 
                                    SUM(COALESCE(l3w_sales, 0)) + 
                                    SUM(COALESCE(l4_weeks_units, 0)) + 
                                    SUM(COALESCE(l5w_sales, 0)) + 
                                    SUM(COALESCE(l6w_sales, 0)) + 
                                    SUM(COALESCE(l7w_sales, 0)) + 
                                    SUM(COALESCE(l8_weeks_units, 0))
                                )::TEXT || '|' ||
                                SUM(COALESCE(l8_weeks_units, 0))::TEXT || ',' ||
                                SUM(COALESCE(l7w_sales, 0))::TEXT || ',' ||
                                SUM(COALESCE(l6w_sales, 0))::TEXT || ',' ||
                                SUM(COALESCE(l5w_sales, 0))::TEXT || ',' ||
                                SUM(COALESCE(l4_weeks_units, 0))::TEXT || ',' ||
                                SUM(COALESCE(l3w_sales, 0))::TEXT || ',' ||
                                SUM(COALESCE(l2w_sales, 0))::TEXT || ',' ||
                                SUM(COALESCE(lw_sales_units, 0))::TEXT   AS sales_last_8_weeks
                                %s
                        FROM art_inv_dash_store where dc_oh + dc_it >0
                        GROUP BY
                                l0_name ,
                                l1_name ,
                                l2_name ,
                                l3_name ,
                                l4_name ,
                                l5_name ,
                                l6_name ,
                                l7_name ,
                                l8_name ,
                                article_orig,
                                article,
                                style_id,
                                color_code,
                                style_desc,
                                assortment_indicator,
                                factory_type,
                                intro_date,
                                article_status_tag,
                                last_allocation_date,
                                product_reach_desc,
								store_group;
                					
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