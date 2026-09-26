--liquibase formatted sql
--changeset adesh:details_metric_v1 runOnChange:true stripComments:false splitStatements:false context:MTP-122243 labels:MTP-122243
--comment: MTP-122243 dynamic KPI columns support
--rollback: SELECT 1

DROP FUNCTION IF EXISTS inventory_smart.details_metric(refcursor, jsonb, jsonb, jsonb);
DROP FUNCTION IF EXISTS inventory_smart.details_metric(refcursor, jsonb, jsonb, jsonb, jsonb);

CREATE OR REPLACE FUNCTION inventory_smart.details_metric(input refcursor, jsonb, jsonb, jsonb, dynamic_kpi_config jsonb DEFAULT '[]'::jsonb)
 RETURNS refcursor
 LANGUAGE plpgsql
AS $function$
declare
	_query_pa text := '';
	_query_sa text := '';
	_query_table_filters text := '';
	_query_combine text := '';
	_channel text := inventory_smart.get_channel_from_input($3);
	_cache_payload jsonb := jsonb_build_object('product_attributes', $2, 'store_attributes', $3);
	_cache_table_id text;
	_cache_schema text := 'inventory_smart';
	_cache_sp text := '.details_metric';
	_cache_key_pattern text := '{schema_name}:{sp_name}:{request}';
	_cache_dependencies text[] := '{inventory_smart.article_inventory_dashboard}';
	-- Column existence JSON
	_column_exists jsonb := '{}'::jsonb;
	-- Dynamic KPI variables
	_dynamic_kpi_columns text := '';
	_kpi_name text;
begin
	raise notice '%', $3->>'channel';
	$2 := $2 || jsonb_build_object('channel',  $3->>'channel');
	
	-- Check column existence once at function start and build JSON
	_column_exists := jsonb_build_object(
		'total_count', EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'inventory_smart' AND table_name = 'article_inventory_dashboard' AND column_name = 'total_count'),
		'in_stock_count', EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'inventory_smart' AND table_name = 'article_inventory_dashboard' AND column_name = 'in_stock_count'),
		'twos', EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'inventory_smart' AND table_name = 'article_inventory_dashboard' AND column_name = 'twos'),
		'total_inv', EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'inventory_smart' AND table_name = 'article_inventory_dashboard' AND column_name = 'total_inv'),
		'wos_oh_oo_it', EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'inventory_smart' AND table_name = 'article_inventory_dashboard' AND column_name = 'wos_oh_oo_it'),
		'wtd_units', EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'inventory_smart' AND table_name = 'article_inventory_dashboard' AND column_name = 'wtd_units'),
		'weekly_units', (
			EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'inventory_smart' AND table_name = 'article_inventory_dashboard' AND column_name = 'w2_units') AND
			EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'inventory_smart' AND table_name = 'article_inventory_dashboard' AND column_name = 'w3_units') AND
			EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'inventory_smart' AND table_name = 'article_inventory_dashboard' AND column_name = 'w4_units') AND
			EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'inventory_smart' AND table_name = 'article_inventory_dashboard' AND column_name = 'w5_units') AND
			EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'inventory_smart' AND table_name = 'article_inventory_dashboard' AND column_name = 'w6_units') AND
			EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'inventory_smart' AND table_name = 'article_inventory_dashboard' AND column_name = 'w7_units') AND
			EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'inventory_smart' AND table_name = 'article_inventory_dashboard' AND column_name = 'w8_units')
		),
		'article_status', EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'inventory_smart' AND table_name = 'ph_master' AND column_name = 'article_status')
	);
	
	_query_pa := inventory_smart.form_main_table_filters('ph_master', $2);
	_query_sa := global.form_main_table_filters('store_attributes_filter', $3);
	-- Replace WHERE with AND since _query_sa is appended after existing WHERE clause
	_query_sa := REPLACE(_query_sa, ' WHERE ', ' AND ');
	
	-- Build dynamic KPI columns from the passed dynamic_kpi_config parameter
	-- Expected format: ["kpi_name_1", "kpi_name_2", ...] - array of KPI names (column names)
	IF dynamic_kpi_config IS NOT NULL AND jsonb_array_length(dynamic_kpi_config) > 0 THEN
		FOR _kpi_name IN SELECT jsonb_array_elements_text(dynamic_kpi_config)
		LOOP
			_dynamic_kpi_columns := _dynamic_kpi_columns || ', ' || quote_ident(_kpi_name);
		END LOOP;
	END IF;
	raise notice 'Dynamic KPI columns --> %', _dynamic_kpi_columns;

	-- Update cache payload to include dynamic KPI config for proper cache differentiation
	_cache_payload := _cache_payload || jsonb_build_object('dynamic_kpi_config', dynamic_kpi_config);

	_query_combine:= FORMAT($$
WITH product_codes_cte AS (
    SELECT DISTINCT article
    FROM inventory_smart.ph_master
    %s
),
art_inv_dash_store AS (
    SELECT 
        aid.*
    FROM inventory_smart.article_inventory_dashboard AS aid
    JOIN "global".store_attributes_filter AS saf USING (store_code, s2_name)
    JOIN product_codes_cte AS pcc USING (article)
    WHERE dc_flag = FALSE
    %s
),
final_result AS (
    SELECT
        l1_name, l2_name, l3_name, l4_name, l5_name, l6_name, l7_name,
        article_original, article, product_description,
            AVG(COALESCE(size_integrity::float, 0)) AS size_integrity,
            AVG(COALESCE(sell_through_perc::float, 0)) AS sell_through_perc,
            SUM(COALESCE(lw_sales_units::int, 0)) AS lw_sales_units,
            SUM(COALESCE(wtd_sales_units::int, 0)) AS wtd_sales_units,
            SUM(COALESCE(dc_oh::int, 0)) AS dc_oh,
            SUM(COALESCE(store_oh_it_oo::int, 0)) AS store_oh_it_oo,
            SUM(COALESCE(lw_margin_perc::int, 0)) AS lw_margin_perc,
            SUM(COALESCE(lw_revenue::int, 0)) AS lw_revenue,
            SUM(COALESCE(wos_oh::int, 0)) AS wos_oh,
            SUM(COALESCE(store_oh::int, 0)) AS store_oh,
            SUM(COALESCE(store_oo::int, 0)) AS store_oo,
            SUM(COALESCE(store_it::int, 0)) AS store_it,
            SUM(COALESCE(store_oh_it::int, 0)) AS store_oh_it,
            SUM(COALESCE(stockout::int, 0)) AS stockout,
            SUM(COALESCE(shortfall::int, 0)) AS shortfall,
            SUM(COALESCE(excess::int, 0)) AS excess,
            SUM(COALESCE(normal::int, 0)) AS normal,
            SUM(COALESCE(lw_promo::float, 0)) AS lw_promo,
            SUM(COALESCE(lw_aur::float, 0)) AS lw_aur,
            SUM(COALESCE(wtd_revenue::int, 0)) AS wtd_revenue,
            SUM(COALESCE(wtd_margin::float, 0)) AS wtd_margin,
            SUM(COALESCE(wtd_promo::float, 0)) AS wtd_promo,
            SUM(COALESCE(wtd_aur::float, 0)) AS wtd_aur,
            SUM(COALESCE(dc_oh_it_oo::int, 0)) AS dc_oh_it_oo
            %s
    FROM art_inv_dash_store
    JOIN product_codes_cte USING (article)
 GROUP BY
        l1_name, l2_name, l3_name, l4_name, l5_name, l6_name, l7_name,
        article_original, article, product_description
)
SELECT * FROM final_result
$$, _query_pa, _query_sa, _dynamic_kpi_columns);


		select * from cache.wrap_sp(
			_cache_schema,
			_cache_sp,
			_cache_payload,
			_query_combine,
			_cache_dependencies,
			_cache_key_pattern) into _cache_table_id;
		_query_table_filters := global.form_table_query($4);
		perform set_config('myvars.cache_table_id', _cache_table_id, true);
		raise notice '%', _query_combine;
		open $1 for execute 'select * from "cache"."' || _cache_table_id || '" X ' || _query_table_filters;
		RETURN $1;
	end
$function$
;
