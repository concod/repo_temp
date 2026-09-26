--liquibase formatted sql
--changeset siddhant:details_metric_dc_onorder_tot_inv_fix runOnChange:true stripComments:false splitStatements:false context:MTP-137838 labels:MTP-137838
--comment: MTP-137838 Fix DC on-order values (oo_dc, dc_oo_30_days, tot_inv)
--rollback: SELECT 1

DROP FUNCTION IF EXISTS inventory_smart.details_metric(input refcursor, jsonb, jsonb, jsonb);
DROP FUNCTION IF EXISTS inventory_smart.details_metric(refcursor, jsonb, jsonb, jsonb, jsonb);

CREATE OR REPLACE FUNCTION inventory_smart.details_metric(input refcursor, jsonb, jsonb, jsonb, dynamic_kpi_config jsonb DEFAULT '[]'::jsonb)
 RETURNS refcursor
 LANGUAGE plpgsql
AS $function$
DECLARE
    _query_pa text := '';
    _query_sa text := '';
    _query_pa_sa TEXT := '';
    _query_table_filters text := '';
    _query_combine text := '';
    _channel text := inventory_smart.get_channel_from_input($3);
    _cache_payload jsonb := jsonb_build_object('product_attributes', $2, 'store_attributes', $3);
    _cache_table_id text;
    _cache_schema text := 'inventory_smart';
    _cache_sp text := '.details_metric';
    _cache_key_pattern text := '{schema_name}:{sp_name}:{request}';
    _cache_dependencies text[] := '{inventory_smart.article_inventory_dashboard}';
    -- Dynamic KPI variables
    _dynamic_kpi_columns text := '';
    _kpi_name text;
BEGIN
    RAISE NOTICE '%', $3->>'channel';
    $2 := $2 || jsonb_build_object('channel', $3->>'channel');
    
    _query_pa := inventory_smart.form_main_table_filters('ph_master', $2);
    _query_sa := global.form_main_table_filters('store_attributes_filter', $3);
    
    _query_pa_sa := _query_pa || 
                    (CASE WHEN LENGTH(_query_sa) > 0 THEN
                        ' AND ' || SUBSTRING(_query_sa, 8)
                     ELSE '' END);
    _query_pa_sa := COALESCE(NULLIF(_query_pa_sa, ''), ' WHERE TRUE');
    
    RAISE NOTICE 'Combined product store attribute query --> %', _query_pa_sa; 
    
    _query_table_filters := global.form_table_query($4);
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
        WITH ph_data AS (
            SELECT DISTINCT 
                article 
            FROM global.product_attributes_filter paf
            %s
        ),
        
        aid AS (
            SELECT
                article,
                style,
                color_name,
                l0_name,
                l1_name,
                l2_name,
                l3_id_name,
                brand,
                markdown_ind,
                first_sale_date,
                last_receipt_date,
                lw_units,
                lw_store_units,
                lw_sfs_units,
                lw_revenue,
                lw_margin,
                lw_discount_amount,
                promo_percentage,
                lw_price,
                lw_aur,
                lw_aps,
                sell_through_rate,
                week_to_date_sales,
                sales_1_ago, 
                sales_2_ago, 
                sales_3_ago, 
                sales_4_ago,
                sales_5_ago, 
                sales_6_ago, 
                sales_7_ago,
                sales_8_ago,
                oh,
                it,
                it_allocated,
                it_shipped,
                it_store_to_store,
                oo_dc,
                dc_oo_30_days,
                tot_inv,
                in_stock_count,
                total_count,
                wos_oh,
                wos_oh_it,
                hybrid_wos,
                hybrid_wos_oh_it,
                upas,
                oh_dc,
                it_dc,
                forecast_this_wk,
                forecast_next_wk,
                forecast_4_next_wk,
                forecast_8_next_wk,
                no_of_stores_oh,
                stockout,
                shortfall,
                normal,
                overstock,
                dc_available,
                store_code,
                fwos,
                twos,
				style_color_status
            FROM inventory_smart.article_inventory_dashboard aid
                JOIN ph_data USING (article)
                %s
        ),

        article_hierarchy AS (
            SELECT 
                DISTINCT article,
                style,
                color_name,
                l0_name,
                l1_name,
                l2_name,
                l3_id_name,
                brand,
                markdown_ind,
                first_sale_date,
                last_receipt_date,
				FIRST_VALUE(style_color_status) OVER (PARTITION BY article ORDER BY CASE WHEN style_color_status IS NULL THEN 1 ELSE 0 END, style_color_status) AS product_tag
            FROM aid
        ),


        last_allocated AS (
            SELECT 
                article,  
                COALESCE(MAX(sdal.updated_at), MAX(ladt.last_allocation_date), NULL) AS last_allocated 
            FROM inventory_smart.last_allocation_date_table ladt 
            LEFT JOIN (select article, MAX(updated_at) as updated_at from inventory_smart.sku_dc_allocated_units GROUP BY article) sdal USING(article)  
            GROUP BY article
        ),
        
        sales_metrics_base AS (
         SELECT
            article,
            SUM(COALESCE(lw_units, 0)) AS sum_lw_units,
            SUM(COALESCE(lw_store_units, 0)) AS sum_lw_store_units,
            SUM(COALESCE(lw_sfs_units, 0)) AS sum_lw_sfs_units,
            SUM(COALESCE(lw_revenue, 0)) AS sum_lw_revenue,
            SUM(COALESCE(lw_margin, 0)) AS sum_lw_margin,
            SUM(COALESCE(abs(lw_discount_amount), 0)) AS sum_lw_discount_amount,
            SUM(COALESCE(abs(lw_revenue) + abs(lw_discount_amount), 0)) AS sum_lw_revenue_discount,
            SUM(COALESCE(abs(lw_revenue), 0)) AS sum_abs_lw_revenue,
            SUM(COALESCE(abs(lw_units), 0)) AS sum_abs_lw_units,
            COUNT(distinct store_code) AS distinct_store_count,
            SUM(COALESCE(oh, 0)) AS sum_oh,
            SUM(COALESCE(week_to_date_sales, 0)) AS sum_week_to_date_sales,
            SUM(COALESCE(sales_1_ago + sales_2_ago + sales_3_ago + sales_4_ago + sales_5_ago + sales_6_ago + sales_7_ago + sales_8_ago, 0)) AS sum_sales_8_weeks,
            SUM(COALESCE(sales_8_ago, 0)) AS sum_sales_8_ago,
            SUM(COALESCE(sales_7_ago, 0)) AS sum_sales_7_ago,
            SUM(COALESCE(sales_6_ago, 0)) AS sum_sales_6_ago,
            SUM(COALESCE(sales_5_ago, 0)) AS sum_sales_5_ago,
            SUM(COALESCE(sales_4_ago, 0)) AS sum_sales_4_ago,
            SUM(COALESCE(sales_3_ago, 0)) AS sum_sales_3_ago,
            SUM(COALESCE(sales_2_ago, 0)) AS sum_sales_2_ago,
            SUM(COALESCE(sales_1_ago, 0)) AS sum_sales_1_ago,
            SUM(tot_inv) AS sum_tot_inv,
            ROUND(CAST(CASE
					WHEN SUM(tot_inv) != 0 THEN SUM(fwos * tot_inv) / SUM(tot_inv)
					ELSE 0
				END AS NUMERIC),
				2) AS fwos,
            ROUND(CAST(CASE
					WHEN SUM(tot_inv) != 0 THEN SUM(twos * tot_inv) / SUM(tot_inv)
					ELSE 0
				END AS NUMERIC),
				2) AS twos,
            MIN(tot_inv) AS min_tot_inv,
            PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY tot_inv) AS p25_tot_inv,
            PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY tot_inv) AS p50_tot_inv,
            PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY tot_inv) AS p75_tot_inv,
            MAX(tot_inv) AS max_tot_inv
            FROM aid
            GROUP BY article
        ),

        sales_metrics AS (
         SELECT
            article,
            CAST(ROUND(sum_lw_units) AS INTEGER) AS lw_units,
            ROUND(sum_lw_store_units::numeric, 2) AS lw_store_units,
            ROUND(sum_lw_sfs_units::numeric, 2) AS lw_sfs_units,
            ROUND(sum_lw_revenue::numeric, 2) AS lw_revenue,
            ROUND(sum_lw_margin::numeric, 2) AS lw_margin,
            CASE
                WHEN sum_lw_revenue_discount > 0 
                THEN ROUND((sum_lw_discount_amount::numeric / sum_lw_revenue_discount::numeric)::numeric, 2)
                ELSE NULL
            END::text AS promo_percentage,
            ROUND((sum_lw_revenue_discount::numeric / NULLIF(sum_abs_lw_units::numeric, 0))::numeric, 2) AS lw_price,
            ROUND((sum_abs_lw_revenue::numeric / NULLIF(sum_abs_lw_units::numeric, 0))::numeric, 2) AS lw_aur,
            ROUND(sum_lw_units::numeric / NULLIF(distinct_store_count::numeric, 0), 2) AS lw_aps,
            ROUND(sum_lw_units::numeric / NULLIF(sum_oh::numeric, 0), 2) AS sell_through_rate,
            ROUND(sum_week_to_date_sales::numeric, 2) AS week_to_date_sales, 
            ROUND(sum_sales_8_weeks::numeric, 2) AS sales_8_ago,
            fwos,
            twos,
            ROUND(sum_sales_8_weeks::numeric, 0)::TEXT || '|' ||
				sum_sales_8_ago::TEXT || ',' ||
				sum_sales_7_ago::TEXT || ',' ||
				sum_sales_6_ago::TEXT || ',' ||
				sum_sales_5_ago::TEXT || ',' ||
				sum_sales_4_ago::TEXT || ',' ||
				sum_sales_3_ago::TEXT || ',' ||
				sum_sales_2_ago::TEXT || ',' ||
				sum_sales_1_ago::TEXT AS sales_last_8_weeks,
				sum_week_to_date_sales::TEXT || '|' ||
				sum_lw_units::TEXT || ',' ||
				sum_week_to_date_sales::TEXT AS sales_cw_vs_lw,
				ARRAY[
			    COALESCE(min_tot_inv, 0),
			    COALESCE(p25_tot_inv, 0),
			    COALESCE(p50_tot_inv, 0),
				COALESCE(p75_tot_inv, 0),
			    COALESCE(max_tot_inv, 0)
			] AS snapshot,
            TRIM(TRAILING '.' FROM TRIM(TRAILING '0' FROM fwos::TEXT)) || ',' ||
			    TRIM(TRAILING '.' FROM TRIM(TRAILING '0' FROM twos::TEXT)) AS cwos
            FROM sales_metrics_base
        ),

        inventory_metrics AS (
            SELECT
                article,
                SUM(coalesce(oh, 0))::numeric(10, 2) as oh,
                SUM(coalesce(it, 0))::numeric(10, 2) as it,
                SUM(coalesce(it_allocated, 0))::numeric(10, 2) as it_allocated,
                SUM(coalesce(it_shipped, 0))::numeric(10, 2) as it_shipped,
                SUM(coalesce(it_store_to_store, 0))::numeric(10, 2) as it_store_to_store,
                ROUND(AVG(case when coalesce(total_count, 0) > 0 then coalesce(in_stock_count, 0) / total_count end)::numeric, 2) as in_stock_perc,
                GREATEST(0, ROUND(SUM(coalesce(oh, 0))::numeric / NULLIF(SUM(coalesce(lw_units, 0))::numeric, 0), 2)) as wos_oh,
                GREATEST(0, ROUND(SUM(coalesce(oh, 0) + coalesce(it, 0))::numeric / NULLIF(SUM(coalesce(lw_units, 0))::numeric, 0), 2)) as wos_oh_it,
                GREATEST(0, ROUND(SUM(coalesce(oh, 0))::numeric / NULLIF(SUM(coalesce(lw_units, 0) + coalesce(lw_sfs_units, 0))::numeric, 0), 2)) as hybrid_wos,
                GREATEST(0, ROUND(SUM(coalesce(oh, 0) + coalesce(it, 0))::numeric / NULLIF(SUM(coalesce(lw_units, 0) + coalesce(lw_sfs_units, 0))::numeric, 0), 2)) as hybrid_wos_oh_it,
                AVG(upas)::numeric(10, 2) as upas
            FROM aid
            join global.store_attributes_filter using(store_code)
            where not dc_flag
            GROUP BY article
        ),

        dc_metrics AS (
            SELECT
                article,
                SUM(dc_available) AS dc_available,
                SUM(oh_dc) AS dc_total,
                ROUND(SUM(COALESCE(oo_dc, 0))::numeric, 2) AS oo_dc,
                ROUND(SUM(COALESCE(dc_oo_30_days, 0))::numeric, 2) AS dc_oo_30_days,
                ROUND(SUM(COALESCE(tot_inv, 0))::numeric, 2) AS tot_inv
            FROM inventory_smart.article_inventory_dashboard
                JOIN ph_data USING (article)
                JOIN global.store_attributes_filter saf USING (store_code)
            GROUP BY article
        ),
        
        forecast_metrics AS (
            SELECT
                article,
                SUM(forecast_this_wk) AS forecast_this_wk,
                SUM(forecast_next_wk) AS forecast_next_wk,
                SUM(forecast_4_next_wk) AS forecast_4_next_wk,
                SUM(forecast_8_next_wk) AS forecast_8_next_wk
            FROM aid
            GROUP BY article
        ),

        store_count AS (
            SELECT
                article,
                AVG(no_of_stores_oh) AS no_of_stores_oh,
                SUM(stockout) AS stockout,
                SUM(shortfall) AS shortfall,
                SUM(normal) AS normal,
                SUM(overstock) AS overstock
            FROM aid
            GROUP BY article
        ),
    
        final_result AS (
            SELECT 
                ah.article, 
                ah.style, 
                ah.color_name,
                ah.l0_name, 
                ah.l1_name, 
                ah.l2_name, 
                ah.l3_id_name,
                ah.brand,
                ah.markdown_ind,
                ah.first_sale_date,
                ah.last_receipt_date,
				ah.product_tag,
                la.last_allocated,
                sm.lw_units,
                sm.lw_store_units,
                sm.lw_sfs_units,
                sm.lw_revenue, 
                sm.lw_margin,
                sm.promo_percentage, 
                sm.lw_price, 
                sm.lw_aur,
                sm.lw_aps,
                sm.sell_through_rate,
                sm.week_to_date_sales,
                sm.sales_8_ago,
                im.oh,
                im.it,
                im.it_allocated,
                im.it_shipped,
                im.it_store_to_store,
                dc.oo_dc,
                dc.dc_oo_30_days,
                dc.tot_inv,
                im.in_stock_perc,
                im.wos_oh,
                im.wos_oh_it,
                im.hybrid_wos,
                im.hybrid_wos_oh_it,
                im.upas,
                dc.dc_available,
                dc.dc_total,
                fm.forecast_this_wk,
                fm.forecast_next_wk,
                fm.forecast_4_next_wk,
                fm.forecast_8_next_wk,
                sc.no_of_stores_oh,
                sc.stockout, 
                sc.shortfall, 
                sc.normal, 
                sc.overstock,
                sm.cwos,
                sm.sales_cw_vs_lw,
                sm.snapshot,
                sm.sales_last_8_weeks
                %s
            FROM article_hierarchy ah
                LEFT JOIN sales_metrics sm ON ah.article = sm.article
                LEFT JOIN inventory_metrics im ON ah.article = im.article
                LEFT JOIN dc_metrics dc ON ah.article = dc.article
                LEFT JOIN forecast_metrics fm ON ah.article = fm.article
                LEFT JOIN store_count sc ON ah.article = sc.article
                LEFT JOIN last_allocated la ON ah.article = la.article
        ) 
        
        SELECT * 
        FROM final_result
        ORDER BY article ASC
    $$, _query_pa, _query_sa, _dynamic_kpi_columns);
    
    SELECT * FROM cache.wrap_sp(
        _cache_schema,
        _cache_sp,
        _cache_payload,
        _query_combine,
        _cache_dependencies,
        _cache_key_pattern
    ) INTO _cache_table_id;
    
    _query_table_filters := global.form_table_query($4);
    PERFORM set_config('myvars.cache_table_id', _cache_table_id, true);
    RAISE NOTICE '%', _query_combine;
    
    OPEN $1 FOR EXECUTE 'SELECT * FROM "cache"."' || _cache_table_id || '" X ' || _query_table_filters;
    RETURN $1;
END;
$function$;
