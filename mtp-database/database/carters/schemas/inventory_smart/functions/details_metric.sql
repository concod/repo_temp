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
				lw_units,
				w2_units,
				w3_units,
				w4_units,
				w5_units,
				w6_units,
				w7_units,
				w8_units,
				lw_revenue,
				lw_margin,
				wtd_units,
				in_stock_count,
				total_count,
				twos,
				msrp,
				promo,
				oh,
				oo,
				it,
				stockout,
				shortfall,
				excess,
				normal,
				total_inv,
				wos_oh_oo_it,
				wos_oh,
				wos_oh_oo,
				ata_eaches,
				ata_packs,
				ata,
				dc_instock,
				dc_oo,
				style,
				style_description,
				l0_name,
				l1_name,
				l2_name,
				l3_name,
				l4_name,
				season,
				gender,
				l5_name,
				class,
				subclass,
				sty_primary_occsn_end_use_dsc,
				product_type,
				clearance_flag,
				launch_date,
				planned_clearance_date,
				price,
				article_alert_flag
			FROM
				inventory_smart.article_inventory_dashboard aid
				join ph_data using (article)
				),
		str_metrics AS
			(
			SELECT
				article,
				CAST(ROUND(SUM(COALESCE(lw_units, 0))) AS INTEGER) AS lw_units,
				CAST(ROUND(SUM(COALESCE(w2_units, 0))) AS INTEGER) AS w2_units,
				CAST(ROUND(SUM(COALESCE(w3_units, 0))) AS INTEGER) AS w3_units,
				CAST(ROUND(SUM(COALESCE(w4_units, 0))) AS INTEGER) AS w4_units,
				CAST(ROUND(SUM(COALESCE(w5_units, 0))) AS INTEGER) AS w5_units,
				CAST(ROUND(SUM(COALESCE(w6_units, 0))) AS INTEGER) AS w6_units,
				CAST(ROUND(SUM(COALESCE(w7_units, 0))) AS INTEGER) AS w7_units,
				CAST(ROUND(SUM(COALESCE(w8_units, 0))) AS INTEGER) AS w8_units,
				CAST(ROUND(SUM(COALESCE(wtd_units, 0))) AS INTEGER) AS wtd_units,
				CAST(ROUND(SUM(COALESCE(lw_revenue, 0))) AS INTEGER) AS lw_revenue,
				CAST(ROUND(SUM(COALESCE(lw_margin, 0))) AS INTEGER) AS lw_margin,
				ROUND(CAST(CASE
					WHEN SUM(msrp) != 0 THEN SUM(msrp * promo) / SUM(msrp)
					ELSE 0
				END AS NUMERIC),
				2) AS promo,
				CAST(ROUND(SUM(COALESCE(oh, 0))) AS INTEGER) AS oh,
				MIN(total_inv) AS min_oh,
				MAX(total_inv) AS max_oh,
				PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY total_inv) AS percentile_25_oh,
				PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY total_inv) AS median_oh,
				PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY total_inv) AS percentile_75_oh,
				CAST(ROUND(SUM(COALESCE(oo, 0))) AS INTEGER) AS oo,
				CAST(ROUND(SUM(COALESCE(it, 0))) AS INTEGER) AS it,
				CAST(ROUND(SUM(COALESCE(stockout, 0))) AS INTEGER) AS stockout,
				CAST(ROUND(SUM(COALESCE(shortfall, 0))) AS INTEGER) AS shortfall,
				CAST(ROUND(SUM(COALESCE(excess, 0))) AS INTEGER) AS excess,
				CAST(ROUND(SUM(COALESCE(normal, 0))) AS INTEGER) AS normal, 
				ROUND(CAST(CASE
					WHEN SUM(total_inv) != 0 THEN SUM(wos_oh_oo_it * total_inv) / SUM(total_inv)
					ELSE 0
				END AS NUMERIC),
				2) AS wos_oh_oo_it,
				ROUND(CAST(CASE
					WHEN SUM(total_inv) != 0 THEN SUM(wos_oh * total_inv) / SUM(total_inv)
					ELSE 0
				END AS NUMERIC),
				2) AS wos_oh,
				ROUND(CAST(CASE
					WHEN SUM(total_inv) != 0 THEN SUM(wos_oh_oo * total_inv) / SUM(total_inv)
					ELSE 0
				END AS NUMERIC),
				2) AS wos_oh_oo,
				ROUND(CAST(CASE
					WHEN SUM(total_count) != 0 THEN SUM(in_stock_count)/SUM(total_count)::FLOAT
					ELSE 0
				END AS NUMERIC),
				2) AS in_stock,
				ROUND(CAST(CASE
					WHEN SUM(total_inv) != 0 THEN SUM(twos * total_inv) / SUM(total_inv)
					ELSE 0
				END AS NUMERIC),
				2) AS twos
			FROM
				aid
			GROUP BY
				article
		),
		dc_metrics AS
			(
			SELECT
				article,
				CAST(ROUND(SUM(COALESCE(ata_eaches, 0))) AS INTEGER) AS ata_eaches,
				CAST(ROUND(SUM(COALESCE(ata_packs, 0))) AS INTEGER) AS ata_packs,
				CAST(ROUND(SUM(COALESCE(ata, 0))) AS INTEGER) AS ata,
				CAST(ROUND(SUM(COALESCE(dc_instock, 0))) AS INTEGER) AS dc_instock,
				CAST(ROUND(SUM(COALESCE(dc_oo, 0))) AS INTEGER) AS dc_oo,
				CAST(ROUND(SUM(COALESCE(dc_instock + dc_oo, 0))) AS INTEGER) AS dc_total_inventory
			FROM
				(
				SELECT
					DISTINCT article,
					ata_eaches,
					ata_packs,
					ata,
					dc_instock,
					dc_oo
				FROM
					aid) a
			GROUP BY
				article
			),
			article_hierarchies AS
			(
			SELECT
				DISTINCT article,
				style,
				style_description,
				l0_name,
				l1_name,
				l2_name,
				l3_name,
				l4_name,
				season,
				gender,
				l5_name,
				class,
				subclass,
				sty_primary_occsn_end_use_dsc,
				product_type,
				clearance_flag,
				launch_date,
				planned_clearance_date,
				price,
				article_alert_flag
			FROM
				aid
			)
		SELECT
			a.article,
			a.style,
			a.style_description,
			a.l0_name,
			a.l1_name,
			a.l2_name,
			a.l3_name,
			a.l4_name,
			a.season,
			a.gender,
			a.l5_name,
			a.class,
			a.subclass,
			a.sty_primary_occsn_end_use_dsc,
			a.product_type AS product_life_cycle,
			a.article_alert_flag AS product_tag,
			a.clearance_flag,
			a.launch_date,
			a.planned_clearance_date,
			COALESCE(b.lw_units, 0) AS lw_units,
			COALESCE(b.lw_revenue, 0) AS lw_revenue,
			COALESCE(b.lw_margin, 0) AS lw_margin,
			COALESCE(b.promo, 0) AS promo,
			a.price,
			COALESCE(b.oh, 0) AS oh,
			COALESCE(b.oo, 0) AS oo,
			COALESCE(b.it, 0) AS it,
			COALESCE(c.ata_eaches, 0) AS ata_eaches,
			COALESCE(c.ata_packs, 0) AS ata_packs,
			COALESCE(c.ata, 0) AS ata,
			COALESCE(c.dc_instock, 0) AS dc_instock,
			COALESCE(c.dc_oo, 0) AS dc_oo,
			COALESCE(c.dc_total_inventory, 0) AS dc_total_inventory,
			COALESCE(b.stockout, 0) AS stockout,
			COALESCE(b.shortfall, 0) AS shortfall,
			COALESCE(b.normal, 0) AS normal,
			COALESCE(b.excess, 0) AS excess,
			COALESCE(b.wos_oh_oo_it, 0) AS wos_oh_oo_it,
			COALESCE(b.wos_oh, 0) AS wos_oh,
			COALESCE(b.wos_oh_oo, 0) AS wos_oh_oo,
			ROUND(COALESCE(b.in_stock, 0), 2) AS in_stock,
			TRIM(TRAILING '.' FROM TRIM(TRAILING '0' FROM b.wos_oh_oo_it::TEXT)) || ',' ||
			TRIM(TRAILING '.' FROM TRIM(TRAILING '0' FROM b.twos::TEXT)) AS cwos,
			COALESCE(b.wtd_units, 0)::TEXT || '|' ||
			COALESCE(b.lw_units, 0)::TEXT || ',' ||
			COALESCE(b.wtd_units, 0)::TEXT AS sales_cw_vs_lw,
			ARRAY[
			    COALESCE(b.min_oh, 0),
			    COALESCE(b.percentile_25_oh, 0),
			    COALESCE(b.median_oh, 0),
				COALESCE(b.percentile_75_oh, 0),
			    COALESCE(b.max_oh, 0)
			] AS snapshot,
			(
			    COALESCE(b.lw_units, 0) + 
			    COALESCE(b.w2_units, 0) + 
			    COALESCE(b.w3_units, 0) + 
			    COALESCE(b.w4_units, 0) + 
			    COALESCE(b.w5_units, 0) + 
			    COALESCE(b.w6_units, 0) + 
			    COALESCE(b.w7_units, 0) + 
			    COALESCE(b.w8_units, 0)
			)::TEXT || '|' ||
			COALESCE(b.w8_units, 0)::TEXT || ',' ||
			COALESCE(b.w7_units, 0)::TEXT || ',' ||
			COALESCE(b.w6_units, 0)::TEXT || ',' ||
			COALESCE(b.w5_units, 0)::TEXT || ',' ||
			COALESCE(b.w4_units, 0)::TEXT || ',' ||
			COALESCE(b.w3_units, 0)::TEXT || ',' ||
			COALESCE(b.w2_units, 0)::TEXT || ',' ||
			COALESCE(b.lw_units, 0)::TEXT   AS sales_last_8_weeks
			%s
		FROM
			article_hierarchies a
		LEFT JOIN
			str_metrics b USING(article)
		LEFT JOIN
			dc_metrics c USING(article)
		order by ata desc
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
