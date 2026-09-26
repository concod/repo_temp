-- liquibase formatted sql
-- changeset osho.sharma@impactanalytics.co:details_metric_store_filter_ambiguity_v1 runOnChange:true stripComments:false splitStatements:false context:MTP-117562-4 labels:MTP-117562-4
-- comment: Apply store filters inside the store_attributes_filter join to avoid ambiguous overlapping store columns

DROP FUNCTION IF EXISTS inventory_smart.details_metric(refcursor, jsonb, jsonb, jsonb, jsonb);
DROP FUNCTION IF EXISTS inventory_smart.details_metric(refcursor, jsonb, jsonb, jsonb, jsonb, jsonb);


CREATE OR REPLACE FUNCTION inventory_smart.details_metric(input refcursor, product_attributes jsonb, store_attributes jsonb, product_store_attributes jsonb, table_filters jsonb, dynamic_metrics jsonb)
 RETURNS refcursor
 LANGUAGE plpgsql
AS $function$
DECLARE
    _query_pa TEXT := '';
    _query_sa TEXT := '';
    _query_psa TEXT := '';
    _query_table_filters TEXT := '';
	dynamic_metric TEXT;
	_query_dynamic_metrics TEXT := '';
    _query_combine TEXT := '';
    _store_join_query TEXT := '';
    _channel TEXT := inventory_smart.get_channel_FROM_input(store_attributes);
    _cache_payload JSONB := jsonb_build_object('product_attributes', product_attributes, 'store_attributes', store_attributes);
    _cache_table_id TEXT;
    _cache_schema TEXT := 'inventory_smart';
    _cache_sp TEXT := '.details_metric';
    _cache_key_pattern TEXT := '{schema_name}:{sp_name}:{request}';
    _cache_dependencies TEXT[] := ARRAY['inventory_smart.article_inventory_dashboard', 'inventory_smart.article_allocation_tracker'];
    v_gen_random_uuid text  := gen_random_uuid()::varchar;
    dynamic_key TEXT;
	product_store_filter_join_query TEXT := '';

BEGIN
    RAISE NOTICE '%', store_attributes->>'channel';
    _query_pa := global.form_main_table_filters('product_attributes_filter', product_attributes);

-- If product_store_attributes is not empty, merge multiple levels (l0_name, l1_name)
    IF product_store_attributes IS NOT NULL
       AND product_store_attributes <> '{}'::jsonb THEN

        FOR dynamic_key IN
            SELECT unnest(ARRAY['l0_name', 'l1_name'])
        LOOP
            IF (product_attributes ? dynamic_key) THEN
                product_store_attributes :=
                    product_store_attributes || jsonb_build_object(
                        dynamic_key, product_attributes->dynamic_key
                    );
            END IF;
        END LOOP;
		_query_psa := global.form_main_table_filters('product_store_attributes_filter', product_store_attributes);

		product_store_filter_join_query := FORMAT($$	join (
        	select distinct store_code from "global".product_store_attributes_filter %s
        ) fps using(store_code) $$, _query_psa) ;
    END IF;

	RAISE NOTICE 'product_store_attributes %', product_store_attributes;

    -- Now generate PSA query after possible merge

    _query_sa := COALESCE(global.form_main_table_filters('store_attributes_filter', store_attributes), '');
    _store_join_query := FORMAT(
        'join (select store_code, store_type from "global".store_attributes_filter %s) saf using(store_code)',
        _query_sa
    );
    _query_table_filters := global.form_table_query(table_filters);
    RAISE NOTICE 'Query filter table --> %', _query_table_filters;

    IF dynamic_metrics IS NOT NULL AND jsonb_array_length(dynamic_metrics) > 0 THEN
	    FOR dynamic_metric IN SELECT jsonb_array_elements_text(dynamic_metrics)
	    LOOP
	        _query_dynamic_metrics := _query_dynamic_metrics || ', ' || dynamic_metric;
	    END LOOP;
	END IF;
	RAISE NOTICE 'Dynamic Metrics Query --> %', _query_dynamic_metrics;

       _query_combine := FORMAT($$

    with product_codes_cte as (
        SELECT DISTINCT
        article, display_article
        from global.product_attributes_filter
        %s
    )
    ,filtered_product AS MATERIALIZED (
      SELECT  * FROM inventory_smart.article_inventory_dashboard aid
        %s
        JOIN product_codes_cte pcc USING (article)
    	%s
        WHERE upper(saf.store_type) = 'STORE'
    )
    ,allocation_date as (
        select aat.article, max(aat.updated_at) as allocated_time from inventory_smart.article_allocation_tracker aat
        JOIN filtered_product aids USING (article)
    group by 1
    ),
    allocation_info as (
    	select art.article, sum(sdav.oh) as available_units, sum(sda.quantity) as allocated_units-- , sum(sdr.quantity) as reserved_units
		from     filtered_product art
            left join inventory_smart.sku_dc_allocated_units sda using(article)
        -- join inventory_smart.sku_dc_reserved_units sdr using (article)
            left join inventory_smart.sku_dc_available_units sdav using (article)
		group by art.article
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
                CAST(ROUND(SUM(COALESCE(lw_revenue, 0))::numeric, 0)AS INTEGER) AS lw_revenue,
				CAST(ROUND(SUM(COALESCE(lw_margin, 0))) AS INTEGER) AS lw_margin,
                ROUND(AVG(COALESCE(promo_percentage, 0))::numeric, 2) as promo_percentage,
				CAST(ROUND(SUM(COALESCE(oh, 0))) AS INTEGER) AS oh,
				CAST(ROUND(SUM(COALESCE(oo, 0))) AS INTEGER) AS oo,
				CAST(ROUND(SUM(COALESCE(it, 0))) AS INTEGER) AS it,
				ROUND(AVG(COALESCE(wos_oh, 1)))  AS avg_wos,
				CAST(ROUND(SUM(coalesce(total_count, 0))) AS INTEGER) AS total_count,
                COALESCE(
                    ROUND(
                        CAST(SUM(wos_oh * oh) / NULLIF(SUM(oh), 0) AS NUMERIC),
                        1
                    ),
                0) AS wos_oh,

                COALESCE(
                    ROUND(
                        CAST(SUM(wos_oh_oo * (oh + oo)) / NULLIF(SUM(oh + oo), 0) AS NUMERIC),
                        1
                    ),
                0) AS wos_oh_oo,

                COALESCE(
                    ROUND(
                        CAST(SUM(wos_oh_it_oo * (oh + it + oo)) / NULLIF(SUM(oh + it + oo), 0) AS NUMERIC),
                        1
                    ),
                0) AS wos_oh_oo_it,
				CAST(ROUND(SUM(COALESCE(stockout, 0))) AS INTEGER) AS stockout,
				CAST(ROUND(SUM(COALESCE(shortfall, 0))) AS INTEGER) AS shortfall,
				CAST(ROUND(SUM(COALESCE(excess, 0))) AS INTEGER) AS excess,
				CAST(ROUND(SUM(COALESCE(normal, 0))) AS INTEGER) AS normal,
				ROUND(AVG(CAST(CASE
					WHEN total_count = 0 THEN 0
					ELSE in_stock_count/total_count
				END AS NUMERIC)),
				2) AS in_stock,
				ROUND(CAST(CASE
					WHEN SUM(oh) != 0 THEN SUM(wos_oh * oh) / SUM(oh)
					ELSE 0
				END AS NUMERIC),
				1) AS fwos,
				ROUND(CAST(
					AVG(wos_target )
				AS NUMERIC),
				1) AS twos,
				MIN(oh) AS min_oh,
				MAX(oh) AS max_oh,
				PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY oh) AS percentile_25_oh,
				PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY oh) AS median_oh,
				PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY oh) AS percentile_75_oh
			FROM
				filtered_product
			GROUP BY
				article
		),
    door_count as (
        SELECT article, COUNT(DISTINCT store_code) AS door_count
        FROM filtered_product
        GROUP BY article
    )
SELECT
            article,
            l1_name,
            l3_name,
            fp.display_article,
            color,
            distributions,
            floorset_date,
            global_fit_platform,
            l2_name,
            l4_name,
            l5_name,
            l6_name,
            l7_code,
            article_description,
            markdown_date,
            size_count,
            door_count,
            article_alert_flag as product_tag,
            MAX(ad.allocated_time) as last_allocated,
            ROUND(AVG(price)::numeric, 2) as price,
            COALESCE((b.oh)::NUMERIC, 0) AS oh,
            COALESCE(b.it, 0) AS it,
            COALESCE(b.oo, 0) AS oo,
            -- SUM(COALESCE(vir_pdu_remaining, 0)) AS vir_pdu_remaining,
            -- SUM(COALESCE(vir_reservation_total, 0)) AS vir_reservation_total,
            SUM(COALESCE(delivered_mtd, 0)) AS delivered_mtd,
            COALESCE(b.lw_revenue, 0) AS lw_revenue,
            COALESCE(b.lw_units, 0) AS lw_units,
            SUM(COALESCE(last_8_week_sales, 0)) AS last_8_week_sales,
            SUM(COALESCE(oh_it, 0)) AS oh_it,
            SUM(COALESCE(oh_it_oo, 0)) AS oh_it_oo,
            -- SUM(COALESCE(iob, 0)) AS iob,
            COALESCE(b.excess, 0) AS excess,
            COALESCE(b.normal, 0) AS normal,
            COALESCE(b.shortfall, 0) AS shortfall,
            COALESCE(b.stockout, 0) AS stockout,
            COALESCE(b.wos_oh, 0) AS wos_oh,
            AVG(COALESCE(wos_oh_it, 0)) AS wos_oh_it,
            ROUND(AVG(COALESCE(wos_oh_it_oo, 0))::numeric, 1) AS wos_oh_it_oo,
            COALESCE(b.wos_oh_oo, 0) AS wos_oh_oo,
            AVG(COALESCE(wos_target, 0)) AS wos_target,
            ROUND(AVG(COALESCE(instock_percentage, 0))::numeric, 2) AS instock_perc,
            ROUND(AVG(COALESCE(lw_margin_perc, 0))::numeric, 1) AS lw_margin_perc,
            ROUND(AVG(COALESCE(perc_committed, 0))::numeric, 1) AS perc_committed,
            ROUND(COALESCE(b.promo_percentage, 0)::numeric, 1) AS promo_percentage,
            ROUND(AVG(COALESCE(sell_through_perc, 0))::numeric, 1) AS sell_through_perc,
            COALESCE(b.lw_margin, 0) AS lw_margin,
			COALESCE(b.total_count, 0) as total_count,
			ROUND(COALESCE(b.in_stock, 0), 2) AS in_stock,
			ROUND(AVG(COALESCE(b.fwos, 0)),1) || ',' ||
			ROUND(AVG(COALESCE(b.twos, 0)),1) AS cwos,
			ROUND(COALESCE(b.wtd_units, 0),0)::TEXT || '|' ||
			ROUND(COALESCE(b.lw_units, 0),0)::TEXT || ',' ||
			ROUND(COALESCE(b.wtd_units, 0),0)::TEXT AS sales_cw_vs_lw,
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
			))
			)::TEXT || '|' ||
			ROUND(COALESCE(b.w8_units, 0),0)::TEXT || ',' ||
			ROUND(COALESCE(b.w7_units, 0),0)::TEXT || ',' ||
			ROUND(COALESCE(b.w6_units, 0),0)::TEXT || ',' ||
			ROUND(COALESCE(b.w5_units, 0),0)::TEXT || ',' ||
			ROUND(COALESCE(b.w4_units, 0),0)::TEXT || ',' ||
			ROUND(COALESCE(b.w3_units, 0),0)::TEXT || ',' ||
			ROUND(COALESCE(b.w2_units, 0),0)::TEXT || ',' ||
			ROUND(COALESCE(b.lw_units, 0),0)::TEXT   AS sales_last_8_weeks
            %s
    FROM filtered_product fp
    left join allocation_date ad using(article)
    LEFT JOIN
			str_metrics b USING(article)
    left join door_count using(article)
    left join allocation_info using(article)
	 GROUP BY
            article,
            l3_name,
            fp.display_article,
            color,
            distributions,
            floorset_date,
            global_fit_platform,
            l2_name,
            l4_name,
            l5_name,
            l6_name,
            l7_code,
            article,
            article_description,
            markdown_date,
            size_count,
            door_count,
            article_alert_flag,
            fp.l1_name,
            allocation_info.available_units,
            allocation_info.allocated_units,
            b.oh,
            b.it,
            b.oo,
            b.lw_revenue,
            b.lw_units,
            b.excess,
            b.normal,
            b.shortfall,
            b.stockout,
            b.wos_oh,
            b.wos_oh_oo,
            b.promo_percentage,
            b.lw_margin,
            b.total_count,
            b.in_stock,
            b.fwos,
            b.twos,
            b.wtd_units,
            b.min_oh,
            b.percentile_25_oh,
            b.median_oh,
            b.percentile_75_oh,
            b.max_oh,
            b.lw_units,
            b.w2_units,
            b.w3_units,
            b.w4_units,
            b.w5_units,
            b.w6_units,
            b.w7_units,
            b.w8_units,
            b.avg_wos,
            fp.display_article
            having COALESCE(allocation_info.available_units,0) - COALESCE(allocation_info.allocated_units, 0) > 0
  $$, _query_pa, _store_join_query, product_store_filter_join_query, _query_dynamic_metrics);
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

  perform  global.sp_log(v_gen_random_uuid,'inventory_smart.details_metric', 'Before RETURN','SELECT * FROM "cache"."' || _cache_table_id || '" ' || _query_table_filters,jsonb_build_object('product_attributes', $2, 'store_attributes', $3, 'table_filters',$4));

    RETURN input;
END
$function$
;
