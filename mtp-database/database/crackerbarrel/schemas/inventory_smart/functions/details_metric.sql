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

		WITH ph_data as (
			select distinct article from global.product_attributes_filter paf
			%s
		)
		,aid AS
			(
			SELECT
				aid.article,
				style_description,
				lw_units,
				w2_units,
				w3_units,
				w4_units,
				w5_units,
				w6_units,
				w7_units,
				w8_units,
				wtd_units,
				total_count,
				in_stock_count,
				lw_revenue,
				lw_margin,
				promo_percentage,
				oh,
				oo,
				it,
				stockout,
				shortfall,
				excess,
				normal,
				tot_inv,
				wos_oh_oo_it,
				wos_oh,
				wos_oh_oo,
				oo_dc,
				oh_dc,
				it_dc,
				ata,
				ata_eaches,
				ata_packs,
				l0_name,
				l1_name,
				l2_name,
				l3_name,
				l4_name,
				l5_name,
				primary_trait_desc,
				product_type,
				item_status,
				twos,
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
				CAST(ROUND(AVG(COALESCE(promo_percentage , 0)) * 100) AS INTEGER) AS promo_percentage,
				CAST(ROUND(SUM(COALESCE(oh, 0))) AS INTEGER) AS oh,
				CAST(ROUND(SUM(COALESCE(oo, 0))) AS INTEGER) AS oo,
				CAST(ROUND(SUM(COALESCE(it, 0))) AS INTEGER) AS it,
				CAST(ROUND(SUM(coalesce(tot_inv, 0))) AS INTEGER) AS tot_inv,
				COALESCE(CAST(ROUND(SUM(wos_oh * oh) / NULLIF(SUM(oh), 0)) AS INTEGER),0) AS wos_oh,
				COALESCE(CAST(ROUND(SUM(wos_oh_oo * (oh+oo)) / NULLIF(SUM(oh+oo), 0)) AS INTEGER),0) AS wos_oh_oo,
				COALESCE(CAST(ROUND(SUM(wos_oh_oo_it * (oh+it+oo)) / NULLIF(SUM(oh+it+oo), 0)) AS INTEGER),0) AS wos_oh_oo_it,
				CAST(ROUND(SUM(COALESCE(stockout, 0))) AS INTEGER) AS stockout,
				CAST(ROUND(SUM(COALESCE(shortfall, 0))) AS INTEGER) AS shortfall,
				CAST(ROUND(SUM(COALESCE(excess, 0))) AS INTEGER) AS excess,
				CAST(ROUND(SUM(COALESCE(normal, 0))) AS INTEGER) AS normal,
				ROUND(CAST(CASE
					WHEN SUM(total_count) != 0 THEN SUM(in_stock_count)/SUM(total_count)
					ELSE 0
				END AS NUMERIC),
				2) AS in_stock,
				ROUND(CAST(CASE
					WHEN SUM(tot_inv) != 0 THEN SUM(wos_oh_oo_it * tot_inv) / SUM(tot_inv)
					ELSE 0
				END AS NUMERIC),
				2) AS fwos,
				ROUND(CAST(CASE
					WHEN SUM(tot_inv) != 0 THEN SUM(twos * tot_inv) / SUM(tot_inv)
					ELSE 0
				END AS NUMERIC),
				2) AS twos,
				MIN(tot_inv) AS min_oh,
				MAX(tot_inv) AS max_oh,
				PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY tot_inv) AS percentile_25_oh,
				PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY tot_inv) AS median_oh,
				PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY tot_inv) AS percentile_75_oh
			FROM
				aid
			GROUP BY
				article
		),
		dc_metrics AS
			(
			SELECT
				article,
				CAST(ROUND(SUM(COALESCE(oo_dc, 0))) AS INTEGER) AS dc_oo,
				CAST(ROUND(SUM(COALESCE(it_dc, 0))) AS INTEGER) AS dc_it,
				CAST(ROUND(SUM(COALESCE(oh_dc, 0))) AS INTEGER) AS dc_oh,
				CAST(ROUND(SUM(coalesce(ata, 0))) as integer) as ata_total,
				CAST(ROUND(SUM(coalesce(ata_packs, 0))) as integer) as ata_packs,
				CAST(ROUND(SUM(coalesce(ata_eaches, 0))) as integer) as ata_eaches
			FROM
				(
				SELECT
					DISTINCT article,
					oo_dc,
					it_dc,
					oh_dc,
					ata,
					ata_eaches,
					ata_packs
				FROM
					aid) a
			GROUP BY
				article
			),
			article_hierarchies AS
			(
			SELECT
				DISTINCT article,
				style_description,
				l0_name,
				l1_name,
				l2_name,
				l3_name,
				l4_name,
				l5_name,
				primary_trait_desc,
				product_type,
				item_status,
				article_alert_flag
			FROM
				aid
			),
			last_allloc AS
			(
			select 
				article,  
				coalesce(max(sdal.updated_at), max(ladt.last_allocation_date), null) as allocated_time 
			from inventory_smart.last_allocation_date_table ladt 
			LEFT JOIN inventory_smart.sku_dc_allocated_units sdal using(article)  
			group by article
		)
		SELECT
			a.article,
			a.style_description,
			a.l0_name,
			a.l1_name,
			a.l2_name,
			a.l3_name,
			a.l4_name,
			a.l5_name,
			a.primary_trait_desc,
			a.product_type,
			a.item_status,
			alloc.allocated_time as last_allocated,
			COALESCE(b.lw_units, 0) AS lw_units,
			COALESCE(b.lw_revenue, 0) AS lw_revenue,
			COALESCE(b.lw_margin, 0) AS lw_margin,
			COALESCE(b.promo_percentage, 0) AS promo_percentage,
			COALESCE(b.oh, 0) AS oh,
			COALESCE(b.oo, 0) AS oo,
			COALESCE(b.it, 0) AS it,
			COALESCE(b.tot_inv, 0) as tot_inv,
			COALESCE(c.dc_oo, 0) AS dc_oo,
			COALESCE(c.dc_oh, 0) AS dc_oh,
			COALESCE(c.dc_it, 0) AS dc_it,
			dc_oo + dc_oh + dc_it as dc_oo_oh_it,
			COALESCE(c.ata_total, 0) as ata_total,
			COALESCE(c.ata_packs, 0) as ata_packs,
			COALESCE(c.ata_eaches, 0) as ata_eaches,
			COALESCE(b.stockout, 0) AS stockout,
			COALESCE(b.shortfall, 0) AS shortfall,
			COALESCE(b.normal, 0) AS normal,
			COALESCE(b.excess, 0) AS excess,
			COALESCE(b.wos_oh_oo_it, 0) AS wos_oh_oo_it,
			COALESCE(b.wos_oh, 0) AS wos_oh,
			COALESCE(b.wos_oh_oo, 0) AS wos_oh_oo,
			ROUND(COALESCE(b.in_stock, 0), 2) AS in_stock,
			COALESCE(b.fwos, 0)::INTEGER || ',' ||
			COALESCE(b.twos, 0)::INTEGER AS cwos,
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
			    ROUND((
			    COALESCE(b.lw_units, 0) + 
			    COALESCE(b.w2_units, 0) + 
			    COALESCE(b.w3_units, 0) + 
			    COALESCE(b.w4_units, 0) + 
			    COALESCE(b.w5_units, 0) + 
			    COALESCE(b.w6_units, 0) + 
			    COALESCE(b.w7_units, 0) + 
			    COALESCE(b.w8_units, 0)
			) / 8.0, 2)
			)::TEXT || '|' ||
			COALESCE(b.w8_units, 0)::TEXT || ',' ||
			COALESCE(b.w7_units, 0)::TEXT || ',' ||
			COALESCE(b.w6_units, 0)::TEXT || ',' ||
			COALESCE(b.w5_units, 0)::TEXT || ',' ||
			COALESCE(b.w4_units, 0)::TEXT || ',' ||
			COALESCE(b.w3_units, 0)::TEXT || ',' ||
			COALESCE(b.w2_units, 0)::TEXT || ',' ||
			COALESCE(b.lw_units, 0)::TEXT   AS sales_last_8_weeks,
			a.article_alert_flag AS product_tag
			%s
		FROM
			article_hierarchies a
		LEFT JOIN
			str_metrics b USING(article)
		LEFT JOIN
			dc_metrics c USING(article)
		LEFT JOIN
			last_allloc alloc USING(article)

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
$function$;