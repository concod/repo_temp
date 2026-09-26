--liquibase formatted sql
--changeset adesh:details_metric_with_custom_kpis_v4 runOnChange:true stripComments:false splitStatements:false context:MTP-133621 labels:MTP-133621
--comment: MTP-133621 custom KPI columns support with normalized name and case matching
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
    _dynamic_kpi_agg_columns_store TEXT := '';
    _dynamic_kpi_agg_columns_dc TEXT := '';
    _dynamic_kpi_select_columns TEXT := '';
    _kpi_rec RECORD;
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

    -- Build dynamic KPI columns with proper aggregation based on location_type
    -- location_type: 'STORE' (stores only), 'WHS' (warehouse/DC only), 'ALL' (both combined)
    IF dynamic_kpi_config IS NOT NULL AND jsonb_array_length(dynamic_kpi_config) > 0 THEN
        FOR _kpi_rec IN 
            SELECT DISTINCT ON (regexp_replace(lower(kc.kpi_name), '[^a-z0-9]+', '_', 'g'))
                regexp_replace(lower(kc.kpi_name), '[^a-z0-9]+', '_', 'g') AS column_name,
                COALESCE(kmm.aggregate_function, 'Sum') AS aggregate_function,
                COALESCE(kmm.location_type, 'STORE') AS location_type
            FROM inventory_smart.kpi_config kc
            JOIN inventory_smart.kpi_module_mapping kmm ON kc.kpi_id = kmm.kpi_id
            JOIN inventory_smart.module_component_mapping mcm ON kmm.module_component_id = mcm.mapping_id
            WHERE mcm.table_name ILIKE '%article_inventory_dashboard%'
              AND kc.is_active = TRUE
              AND (
                  regexp_replace(lower(kc.kpi_name), '[^a-z0-9]+', '_', 'g') IN (
                      SELECT attname
                      FROM pg_attribute a
                      JOIN pg_class c ON a.attrelid = c.oid
                      JOIN pg_namespace n ON c.relnamespace = n.oid
                      WHERE n.nspname = 'inventory_smart'
                        AND c.relname = regexp_replace(mcm.table_name, '_base$', '')
                        AND a.attnum > 0
                        AND NOT a.attisdropped
                  )
                  OR regexp_replace(lower(kc.kpi_name), '[^a-z0-9]+', '_', 'g') IN (
                      SELECT regexp_replace(lower(bkm.kpi_name), '[^a-z0-9]+', '_', 'g')
                      FROM inventory_smart.bq_kpi_mapping bkm
                      WHERE bkm.table_name = mcm.table_name
                  )
              )
              AND regexp_replace(lower(kc.kpi_name), '[^a-z0-9]+', '_', 'g') IN (SELECT jsonb_array_elements_text(dynamic_kpi_config))
            ORDER BY regexp_replace(lower(kc.kpi_name), '[^a-z0-9]+', '_', 'g')
        LOOP
            -- Build column for aid CTE (raw column)
            _dynamic_kpi_columns := _dynamic_kpi_columns || ', ' || quote_ident(_kpi_rec.column_name);
            
            -- Build aggregation expression based on aggregate_function
            DECLARE
                _agg_expr TEXT;
            BEGIN
                _agg_expr := CASE LOWER(_kpi_rec.aggregate_function)
                    WHEN 'sum' THEN 
                        'CAST(ROUND(SUM(COALESCE(' || quote_ident(_kpi_rec.column_name) || ', 0))) AS INTEGER) AS ' || quote_ident(_kpi_rec.column_name)
                    WHEN 'avg' THEN 
                        'ROUND(AVG(COALESCE(' || quote_ident(_kpi_rec.column_name) || ', 0))::numeric, 2) AS ' || quote_ident(_kpi_rec.column_name)
                    WHEN 'count' THEN 
                        'COUNT(' || quote_ident(_kpi_rec.column_name) || ') AS ' || quote_ident(_kpi_rec.column_name)
                    WHEN 'max' THEN 
                        'MAX(COALESCE(' || quote_ident(_kpi_rec.column_name) || ', 0)) AS ' || quote_ident(_kpi_rec.column_name)
                    WHEN 'min' THEN 
                        'MIN(COALESCE(' || quote_ident(_kpi_rec.column_name) || ', 0)) AS ' || quote_ident(_kpi_rec.column_name)
                    ELSE 
                        'CAST(ROUND(SUM(COALESCE(' || quote_ident(_kpi_rec.column_name) || ', 0))) AS INTEGER) AS ' || quote_ident(_kpi_rec.column_name)
                END;

                -- Add to appropriate CTE based on location_type
                IF _kpi_rec.location_type IN ('STORE', 'ALL') THEN
                    _dynamic_kpi_agg_columns_store := _dynamic_kpi_agg_columns_store || ', ' || _agg_expr;
                END IF;

                IF _kpi_rec.location_type IN ('WHS', 'ALL') THEN
                    _dynamic_kpi_agg_columns_dc := _dynamic_kpi_agg_columns_dc || ', ' || _agg_expr;
                END IF;

                -- Build select for final query based on location_type
                IF _kpi_rec.location_type = 'STORE' THEN
                    -- STORE only: select from str_metrics (b)
                    _dynamic_kpi_select_columns := _dynamic_kpi_select_columns || ', COALESCE(b.' || quote_ident(_kpi_rec.column_name) || ', 0) AS ' || quote_ident(_kpi_rec.column_name);
                ELSIF _kpi_rec.location_type = 'WHS' THEN
                    -- WHS only: select from dc_metrics (c)
                    _dynamic_kpi_select_columns := _dynamic_kpi_select_columns || ', COALESCE(c.' || quote_ident(_kpi_rec.column_name) || ', 0) AS ' || quote_ident(_kpi_rec.column_name);
                ELSE
                    -- ALL: combine store + dc values
                    _dynamic_kpi_select_columns := _dynamic_kpi_select_columns || ', COALESCE(b.' || quote_ident(_kpi_rec.column_name) || ', 0) + COALESCE(c.' || quote_ident(_kpi_rec.column_name) || ', 0) AS ' || quote_ident(_kpi_rec.column_name);
                END IF;
            END;
        END LOOP;
    END IF;

    RAISE NOTICE 'Dynamic KPI columns (aid) --> %', _dynamic_kpi_columns;
    RAISE NOTICE 'Dynamic KPI agg columns (str_metrics) --> %', _dynamic_kpi_agg_columns_store;
    RAISE NOTICE 'Dynamic KPI agg columns (dc_metrics) --> %', _dynamic_kpi_agg_columns_dc;
    RAISE NOTICE 'Dynamic KPI select columns (final) --> %', _dynamic_kpi_select_columns;

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
				lw_units as lw_qty,
				sales_1_ago,
				sales_2_ago,
				sales_3_ago,
				sales_4_ago,
				sales_5_ago,
				sales_6_ago,
				sales_7_ago,
				sales_8_ago,
				lw_revenue,
				lw_margin,
				promo_percentage,
				week_to_date_sales,
				aur,
				oh,
				oo,
				it,
				stockout,
				style_color_status,
				shortfall,
				excess,
				normal,
				wos_oh_it,
				wos_oh,
				wos,
				twos,
				l0_name,
				l1_name,
				l2_name,
				l3_name,
				l5_name,
				l6_name,
				style_name,
				tot_inv,
				si,
				si_oh_oo_it,
				oh_dc,
				product_type,
				saf.special_classification
				%s
			            FROM inventory_smart.article_inventory_dashboard aid
				join ph_data using (article)
			join global.store_attributes_filter saf on aid.store_code =saf.store_code
				),
		str_metrics AS
			(
			SELECT
				article,
				CAST(ROUND(SUM(COALESCE(lw_qty, 0))) AS INTEGER) AS lw_qty,
				CAST(ROUND(SUM(COALESCE(sales_1_ago, 0))) AS INTEGER) AS sales_1_ago,
				CAST(ROUND(SUM(COALESCE(sales_2_ago, 0))) AS INTEGER) AS sales_2_ago,
				CAST(ROUND(SUM(COALESCE(sales_3_ago, 0))) AS INTEGER) AS sales_3_ago,
				CAST(ROUND(SUM(COALESCE(sales_4_ago, 0))) AS INTEGER) AS sales_4_ago,
				CAST(ROUND(SUM(COALESCE(sales_5_ago, 0))) AS INTEGER) AS sales_5_ago,
				CAST(ROUND(SUM(COALESCE(sales_6_ago, 0))) AS INTEGER) AS sales_6_ago,
				CAST(ROUND(SUM(COALESCE(sales_7_ago, 0))) AS INTEGER) AS sales_7_ago,
				CAST(ROUND(SUM(COALESCE(sales_8_ago, 0))) AS INTEGER) AS sales_8_ago,
				CAST(ROUND(SUM(COALESCE(week_to_date_sales, 0))) AS INTEGER) AS week_to_date_sales,
				ROUND(SUM(COALESCE(lw_revenue, 0))::numeric, 2) AS lw_revenue,
				ROUND(SUM(COALESCE(lw_margin, 0))::numeric, 2) AS lw_margin,
				ROUND(AVG(COALESCE(promo_percentage, 0))::numeric, 2) AS promo_percentage,
				ROUND(AVG(COALESCE(si , 0))::numeric, 2) AS si,
				ROUND(AVG(COALESCE(si_oh_oo_it , 0) * 100)::numeric, 2) AS si_oh_oo_it,
				ROUND(AVG(COALESCE(aur , 0))::numeric, 2) AS aur,
				CAST(ROUND(SUM(COALESCE(oh, 0))) AS INTEGER) AS oh,
				MIN(tot_inv) AS min_oh,
				MAX(tot_inv) AS max_oh,
				PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY tot_inv) AS percentile_25_oh,
				PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY tot_inv) AS median_oh,
				PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY tot_inv) AS percentile_75_oh,
				CAST(ROUND(SUM(COALESCE(oo, 0))) AS INTEGER) AS oo,
				CAST(ROUND(SUM(COALESCE(it, 0))) AS INTEGER) AS it,
				CAST(ROUND(SUM(COALESCE(tot_inv, 0))) AS INTEGER) AS tot_inv,
				ROUND(cast(case when SUM(oh + it) != 0 then SUM(wos_oh_it * (oh+it)) / SUM(oh+it) else 0 end as numeric), 2) AS wos_oh_it,
				ROUND(cast(case when SUM(oh) != 0 then SUM(wos_oh * (oh)) / SUM(oh) else 0 end as numeric), 2) AS wos_oh,
				ROUND(cast(case when SUM(tot_inv) != 0 then SUM(wos * tot_inv) / SUM(tot_inv) else 0 end as numeric), 2) AS wos,
				ROUND(cast(case when SUM(tot_inv) != 0 then SUM(twos * tot_inv) / SUM(tot_inv) else 0 end as numeric), 2) AS twos,
				CAST(ROUND(SUM(COALESCE(stockout, 0))) AS INTEGER) AS stockout,
				CAST(ROUND(SUM(COALESCE(shortfall, 0))) AS INTEGER) AS shortfall,
				CAST(ROUND(SUM(COALESCE(excess, 0))) AS INTEGER) AS excess,
				CAST(ROUND(SUM(COALESCE(normal, 0))) AS INTEGER) AS normal,
				ROUND(CAST(CASE
					WHEN SUM(tot_inv) != 0 THEN SUM(wos * tot_inv) / SUM(tot_inv)
					ELSE 0
				END AS NUMERIC),
				2) AS fwos
				%s
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
			%s
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
			a.l5_name,
			a.l6_name,
			style_name,
			a.product_type,
			a.style_color_status AS product_tag,
			COALESCE(b.lw_revenue, 0) AS lw_revenue,
			COALESCE(b.lw_margin, 0) AS lw_margin,
			COALESCE(b.lw_qty, 0) AS lw_qty,
			COALESCE(b.promo_percentage, 0) AS promo_percentage,
			COALESCE(b.si, 0) AS si,
			COALESCE(c.oh_dc, 0) AS oh_dc,
			COALESCE(b.aur, 0) as aur,
			COALESCE(b.oh, 0) AS oh,
			COALESCE(b.oo, 0) AS oo,
			COALESCE(b.it, 0) AS it,
			COALESCE(b.tot_inv, 0) AS tot_inv,
			COALESCE(b.wos_oh_it, 0) AS wos_oh_it ,
			COALESCE(b.wos_oh, 0) AS wos_oh ,
			COALESCE(b.wos, 0) AS wos,	
			COALESCE(b.stockout, 0) AS stockout,
			COALESCE(b.shortfall, 0) AS shortfall,
			COALESCE(b.normal, 0) AS normal,
			COALESCE(b.excess, 0) AS excess	,
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
			TRIM(TRAILING '.' FROM TRIM(TRAILING '0' FROM COALESCE(b.fwos, 0)::TEXT)) || ',' ||
			TRIM(TRAILING '.' FROM TRIM(TRAILING '0' FROM COALESCE(b.twos, 0)::TEXT)) AS cwos,
			COALESCE(b.si, 0)::TEXT || ',' ||
			COALESCE(b.si_oh_oo_it, 0)::TEXT AS size_in_stock
			%s
		FROM
			aid a
		LEFT JOIN
			str_metrics b USING(article)
			left join dc_metrics c using(article)
			where a.special_classification='STORE'
 and c.oh_dc > 0
	$$, _query_pa_sa, _dynamic_kpi_columns, _dynamic_kpi_agg_columns_store, _dynamic_kpi_agg_columns_dc, _dynamic_kpi_select_columns);
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
