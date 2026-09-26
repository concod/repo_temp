--liquibase formatted sql
--changeset adesh:details_metric_v1 runOnChange:true stripComments:false splitStatements:false context:MTP-122243 labels:MTP-122243
--comment: MTP-122243 dynamic KPI columns support
--rollback: SELECT 1
DROP FUNCTION IF EXISTS inventory_smart.details_metric(refcursor, jsonb, jsonb, jsonb);
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
    v_gen_random_uuid text  := gen_random_uuid()::varchar;
    _cache_payload JSONB := jsonb_build_object('product_attributes', product_attributes, 'store_attributes', store_attributes);
    _cache_table_id TEXT;
    _cache_schema TEXT := 'inventory_smart';
    _cache_sp TEXT := '.details_metric';
    _cache_key_pattern TEXT := '{schema_name}:{sp_name}:{request}';
    _cache_dependencies TEXT[] := ARRAY['inventory_smart.article_inventory_dashboard', 'inventory_smart.article_allocation_tracker'];
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
		WITH ph_data as (
			select distinct article from global.product_attributes_filter paf
			%s
		)
		,aid AS 
			(
			SELECT
				aid.article,
				aid.l0_name,
				l1_name,
				l2_name,
				l3_name,
				l4_name,
				style_name,
				range_name,
				last_week_sales as lw_qty,
				last_week_revenue as lw_revenue,
				lw_margin,
				oh,
				oo,
				it,
				aid.total_inv,
				dos_oh,
				dos_oh_it,
				dos,
				oh_dc,
				stockout,
				shortfall,
				normal,
				excess,
				aid.special_classification,
				aid.sales_1_ago,
				aid.sales_2_ago ,
				aid.sales_3_ago ,
				aid.sales_4_ago ,
				aid.sales_5_ago ,
				aid.sales_6_ago ,
				aid.sales_7_ago ,
				aid.sales_8_ago ,
				aid.week_to_date_sales, 
				aid.promo_percentage,
				aid.aur,
				aid.tdos,
				aid.size_integrity ,
				aid.size_integrity_oh_oo_it 
			FROM
				inventory_smart.article_inventory_dashboard aid
				join ph_data using (article)
			join global.store_attributes_filter saf on aid.store_code =saf.store_code
				),
		str_metrics AS
			(
			SELECT
				article,
				CAST(ROUND(SUM(COALESCE(sales_1_ago, 0))) AS INTEGER) AS sales_1_ago,
				CAST(ROUND(SUM(COALESCE(sales_2_ago, 0))) AS INTEGER) AS sales_2_ago,
				CAST(ROUND(SUM(COALESCE(sales_3_ago, 0))) AS INTEGER) AS sales_3_ago,
				CAST(ROUND(SUM(COALESCE(sales_4_ago, 0))) AS INTEGER) AS sales_4_ago,
				CAST(ROUND(SUM(COALESCE(sales_5_ago, 0))) AS INTEGER) AS sales_5_ago,
				CAST(ROUND(SUM(COALESCE(sales_6_ago, 0))) AS INTEGER) AS sales_6_ago,
				CAST(ROUND(SUM(COALESCE(sales_7_ago, 0))) AS INTEGER) AS sales_7_ago,
				CAST(ROUND(SUM(COALESCE(sales_8_ago, 0))) AS INTEGER) AS sales_8_ago,
				CAST(ROUND(SUM(COALESCE(week_to_date_sales, 0))) AS INTEGER) AS week_to_date_sales,
				CAST(ROUND(SUM(COALESCE(lw_qty, 0))) AS INTEGER) AS lw_qty,
				ROUND(SUM(COALESCE(lw_revenue, 0))::numeric, 2) AS lw_revenue,
				ROUND(SUM(COALESCE(lw_margin, 0))::numeric, 2) AS lw_margin,
				ROUND(AVG(COALESCE(promo_percentage, 0))::numeric, 2) AS promo_percentage,
				ROUND(AVG(COALESCE(size_integrity , 0))::numeric, 2) AS si,
				ROUND(AVG(COALESCE(size_integrity_oh_oo_it , 0) * 100)::numeric, 2) AS si_oh_oo_it,
				ROUND(AVG(COALESCE(aur , 0))::numeric, 2) AS aur,
				CAST(ROUND(SUM(COALESCE(oh, 0))) AS INTEGER) AS oh,
				MIN(total_inv) AS min_oh,
				MAX(total_inv) AS max_oh,
				PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY total_inv) AS percentile_25_oh,
				PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY total_inv) AS median_oh,
				PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY total_inv) AS percentile_75_oh,
				CAST(ROUND(SUM(COALESCE(oo, 0))) AS INTEGER) AS oo,
				CAST(ROUND(SUM(COALESCE(it, 0))) AS INTEGER) AS it,
				CAST(ROUND(SUM(COALESCE(total_inv, 0))) AS INTEGER) AS total_inv,
				ROUND(CAST(CASE
					WHEN SUM(total_inv) != 0 THEN SUM(dos * total_inv) / SUM(total_inv)
					ELSE 0
				END AS NUMERIC),
				2) AS dos,
				ROUND(CAST(CASE
					WHEN SUM(total_inv) != 0 THEN SUM(dos_oh * total_inv) / SUM(total_inv)
					ELSE 0
				END AS NUMERIC),
				2) AS dos_oh,
				ROUND(CAST(CASE
					WHEN SUM(total_inv) != 0 THEN SUM(dos_oh_it * total_inv) / SUM(total_inv)
					ELSE 0
				END AS NUMERIC),
				2) AS dos_oh_it,
				ROUND(CAST(CASE
					WHEN SUM(total_inv) != 0 then SUM(tdos * total_inv) / SUM(total_inv)
					ELSE 0 
				END AS NUMERIC),
				2) AS twos,
				CAST(ROUND(SUM(COALESCE(stockout, 0))) AS INTEGER) AS stockout,
				CAST(ROUND(SUM(COALESCE(shortfall, 0))) AS INTEGER) AS shortfall,
				CAST(ROUND(SUM(COALESCE(excess, 0))) AS INTEGER) AS excess,
				CAST(ROUND(SUM(COALESCE(normal, 0))) AS INTEGER) AS normal,
				ROUND(CAST(CASE
					WHEN SUM(total_inv) != 0 THEN SUM(dos * total_inv) / SUM(total_inv)
					ELSE 0
				END AS NUMERIC),
				2) AS fwos
			FROM
				aid
			where special_classification='STORE'
			GROUP BY
				article
		)
		, dc_metrics as (
		select
			article,
			CAST(ROUND(SUM(COALESCE(oh_dc, 0))) AS INTEGER) AS oh_dc
		FROM aid
		where special_classification='WHS'
		GROUP BY article
		)
		SELECT
			distinct a.article,
			a.l0_name,
			a.l1_name,
			a.l2_name,
			a.l3_name,
			a.l4_name,
			style_name,
			range_name,
			COALESCE(b.lw_revenue, 0) AS lw_revenue,
			COALESCE(b.lw_margin, 0) AS lw_margin,
			COALESCE(b.lw_qty, 0) AS lw_qty,
			COALESCE(b.promo_percentage, 0) AS promo_percentage,
			COALESCE(c.oh_dc, 0) AS oh_dc,
			COALESCE(b.aur, 0) as aur,
			COALESCE(b.oh, 0) AS oh,
			COALESCE(b.oo, 0) AS oo,
			COALESCE(b.it, 0) AS it,
			COALESCE(b.total_inv, 0) AS total_inv,
			COALESCE(b.dos_oh, 0) AS dos_oh,
			COALESCE(b.dos_oh_it, 0) AS dos_oh_it,
			COALESCE(b.dos, 0) AS dos,
			COALESCE(b.stockout, 0) AS stockout,
			COALESCE(b.shortfall, 0) AS shortfall,
			COALESCE(b.normal, 0) AS normal,
			COALESCE(b.excess, 0) AS excess,
			COALESCE(b.week_to_date_sales, 0) ::TEXT || '|' ||
			COALESCE(b.lw_qty, 0)::TEXT || ',' ||
			COALESCE(b.week_to_date_sales, 0)::TEXT AS sales_cw_vs_lw,
			(
			    COALESCE(b.sales_1_ago, 0) + 
			    COALESCE(b.sales_2_ago, 0) + 
			    COALESCE(b.sales_3_ago, 0) + 
			    COALESCE(b.sales_4_ago, 0) + 
			    COALESCE(b.sales_5_ago, 0) + 
			    COALESCE(b.sales_6_ago, 0) + 
			    COALESCE(b.sales_7_ago, 0) + 
			    COALESCE(b.sales_8_ago, 0)
			)::TEXT || '|' ||
			COALESCE(b.sales_8_ago, 0)::TEXT || ',' ||
			COALESCE(b.sales_7_ago, 0)::TEXT || ',' ||
			COALESCE(b.sales_6_ago, 0)::TEXT || ',' ||
			COALESCE(b.sales_5_ago, 0)::TEXT || ',' ||
			COALESCE(b.sales_4_ago, 0)::TEXT || ',' ||
			COALESCE(b.sales_3_ago, 0)::TEXT || ',' ||
			COALESCE(b.sales_2_ago, 0)::TEXT || ',' ||
			COALESCE(b.sales_1_ago, 0)::TEXT AS sales_last_8_weeks,
			ARRAY[
			    COALESCE(b.min_oh, 0),
			    COALESCE(b.percentile_25_oh, 0),
			    COALESCE(b.median_oh, 0),
				COALESCE(b.percentile_75_oh, 0),
			    COALESCE(b.max_oh, 0)
			] AS snapshot,
			-- TRIM(TRAILING '.' FROM TRIM(TRAILING '0' FROM COALESCE(b.fwos, 0)::TEXT)) || ',' ||
			-- TRIM(TRAILING '.' FROM TRIM(TRAILING '0' FROM COALESCE(b.twos, 0)::TEXT)) AS cwos,
			CASE 
		        WHEN coalesce(b.fwos, 0) = 0 THEN '0'
		        ELSE TRIM(trailing '.' from TRIM(trailing '0' from coalesce(b.fwos, 0)::TEXT))
		    END || ',' ||
		    CASE 
		        WHEN coalesce(b.twos, 0) = 0 THEN '0'
		        ELSE TRIM(trailing '.' from TRIM(trailing '0' from coalesce(b.twos, 0)::TEXT))
		    END as cwos,
			COALESCE(b.si, 0)::TEXT || ',' ||
			COALESCE(b.si_oh_oo_it, 0)::TEXT AS size_in_stock
			%s
		FROM
			aid a
		LEFT JOIN
			str_metrics b USING(article)
			left join dc_metrics c using(article)
			where special_classification='STORE'and c.oh_dc > 0
	$$, _query_pa_sa, _dynamic_kpi_columns);
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
	perform  global.sp_log(v_gen_random_uuid, 'inventory_smart.details_metric', 'Before returning function value',null,jsonb_build_object('product_attributes',product_attributes,'store_attributes',store_attributes,'table_filters',table_filters,'dynamic_kpi_config',dynamic_kpi_config));
    RETURN input;
END
$function$
;
