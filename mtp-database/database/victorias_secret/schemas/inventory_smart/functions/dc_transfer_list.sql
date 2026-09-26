--liquibase formatted sql
--changeset gururaj.patil:dc_transfer_list runOnChange:true stripComments:false splitStatements:false context:added current_assortment_group in dc_transfer_list labels:MTP-114021
--comment: added current_assortment_group in dc_transfer_list
--rollback: SELECT 1

DROP FUNCTION IF EXISTS inventory_smart.dc_transfer_list(refcursor, jsonb, jsonb, jsonb);

CREATE OR REPLACE FUNCTION inventory_smart.dc_transfer_list(refcursor, jsonb, jsonb, jsonb, _dc_transfer_code uuid)
 RETURNS refcursor
 LANGUAGE plpgsql
AS $function$
declare 
_pa_query text;
_sa_query text;
_pa_sa_query text;
_query_meta_filters text;
_query_combine text;
v_gen_random_uuid text  := gen_random_uuid()::varchar;

begin
	_pa_query := inventory_smart.form_dc_dc_transfer_table_filters('dc_transfer_constraints', $2);
	raise notice '_where: %', _pa_query;

    _sa_query := global.form_main_table_filters('store_attributes_filter', $3);
    _sa_query := replace(_sa_query, 'WHERE', '');
	raise notice '_where: %', _sa_query;

    if _sa_query is not null and length(trim(_sa_query)) > 0 then
        _pa_sa_query := _pa_query || ' AND ' || _sa_query;
    else
        _pa_sa_query := _pa_query;
    end if;
    raise notice '_pa_sa_query: %', _pa_sa_query;

    _query_meta_filters := inventory_smart.form_table_query($4); 
	raise notice '_query_meta_filters: %', _query_meta_filters;

	_query_combine := '
	with get_article_list AS materialized (
		WITH get_data_article_list AS materialized (
			SELECT
				*
			FROM (
				SELECT DISTINCT
					hierarchy->>''article'' as article,
					dc as dc_code
				FROM inventory_smart.dc_service_levels dsl
				JOIN global.store_attributes_filter saf 
					ON dsl.dc::int = saf.dc_code
				' || _pa_sa_query || '
			) b
		),
		article_recommendations AS (
			SELECT 
				article,
				bool_or(recommendation_flag) as has_recommendation
			FROM inventory_smart.dc_details_table dsl
			WHERE EXISTS (
				SELECT 1 
				FROM get_data_article_list gdal 
				WHERE dsl.article = gdal.article 
				AND dsl.dc_code = gdal.dc_code
			)
			GROUP BY article
		)
		SELECT DISTINCT 
			article,
			has_recommendation
		FROM article_recommendations
		ORDER BY has_recommendation DESC, article
	),
	article_list AS (
		SELECT article FROM get_article_list '|| _query_meta_filters || '
	),
	dc_service_levels as materialized(
		select
			hierarchy->>''size'' as size,
			hierarchy->>''product_code'' as product_code,
			hierarchy->>''article'' as article,
			hierarchy->>''l6_name'' as article_description,
			hierarchy->>''l0_name'' as l0_name,
			hierarchy->>''subbrand_code_desc'' as subbrand_code_desc,
			hierarchy->>''l2_name'' as l2_name,
			hierarchy->>''l3_name'' as l3_name,
			hierarchy->>''l4_name'' as l4_name,
			hierarchy->>''l5_name'' as l5_name,
			hierarchy->>''l6_name'' as l6_name,
			hierarchy->>''masterstyle_descr'' as masterstyle_descr,
			hierarchy->>''product_lifecycle'' as product_lifecycle,
			hierarchy->>''current_assortment_group'' as current_assortment_group,
			saf.dc_code,
			saf.store_code as linked_store_code,
			target_wos,
			min_stock
		FROM
			inventory_smart.dc_service_levels dsl
		JOIN global.store_attributes_filter saf on
			dsl.dc::int = saf.dc_code
		JOIN article_list on dsl.hierarchy->>''article'' = article
	),
	get_top_20_data AS materialized(
		SELECT * FROM dc_service_levels
	),
	allocated_units AS  materialized(
		SELECT article, dc_code, size, SUM(quantity) as quantity FROM inventory_smart.sku_dc_allocated_units('''', (SELECT array_agg(article) FROM article_list)) GROUP BY article, dc_code, size
	),
	dc_to_dc_available_units AS  materialized(
		SELECT * FROM inventory_smart.dc_to_dc_available_units((SELECT string_agg(article, '','')::varchar FROM article_list))
	),
	available_units AS  materialized(
		SELECT
			dtda.product_code,
			dtda.article,
			dtda.dc_code,
			dtda.size,
			oh - COALESCE(sdru.quantity, 0) - COALESCE(sda.quantity, 0) as oh
		FROM dc_to_dc_available_units dtda
		LEFT JOIN (SELECT article, size, dc_code, SUM(quantity) AS quantity 
				FROM inventory_smart.sku_dc_reserved_units((SELECT array_agg(article) FROM article_list)) 
				WHERE type <> ''D'' 
				GROUP BY 1,2,3) sdru
			ON dtda.article = sdru.article AND dtda.size = sdru.size 
			AND dtda.dc_code = sdru.dc_code	
		LEFT JOIN allocated_units sda 
			ON dtda.article = sda.article AND dtda.size = sda.size 
			AND dtda.dc_code = sda.dc_code				
	),
	article_dc_level AS MATERIALIZED (
		SELECT
			product_code,
			article,
			dsl.size,
			article_description,
			l0_name,
			subbrand_code_desc,
			l2_name,
			l3_name,
			l4_name,
			l5_name,
			l6_name,
			masterstyle_descr,
			product_lifecycle,
			current_assortment_group,
			dc_code,
			linked_store_code,
			recommendation_flag,
			next_po_upcoming_units,
			demand_projection,
			target_wos,
			next_po_upcoming_date,
			sales_forecast,
			cwos,
			min_stock,
			safety_stock_units
		FROM
			get_top_20_data dsl
		JOIN (
			SELECT
				product_code,
				article,
				dc_code,
				recommendation_flag,
				next_po_upcoming_units,
				next_po_upcoming_date,
				demand_projection,
				sales_forecast,
				cwos,
				safety_stock as safety_stock_units
			FROM
				inventory_smart.dc_details_table
			WHERE article IN (SELECT article FROM article_list)
		) ddt USING(product_code, article, dc_code)
	),
	oh_query as materialized (
		SELECT
			product_code,
			article,
			dc_code,
			adl."size" as a_size,
			article_description,
			l0_name,
			subbrand_code_desc,
			l2_name,
			l3_name,
			l4_name,
			l5_name,
			l6_name,
			masterstyle_descr,
			product_lifecycle,
			current_assortment_group,
			linked_store_code,
			recommendation_flag,
			next_po_upcoming_units,
			demand_projection,
			target_wos,
			next_po_upcoming_date,
			sales_forecast,
			cwos,
			min_stock,
			safety_stock_units, 
			coalesce(oh.oh, 0) as oh
		FROM article_dc_level adl
		LEFT JOIN available_units oh USING(product_code, article, dc_code)
	),
	pre_approved_articles as materialized (
		SELECT article 
		FROM inventory_smart.dc_review_recommendation_updated 
		WHERE status_code = 3
		AND updated_at >= date(now() AT TIME ZONE ''America/New_York'')::timestamp AT TIME ZONE ''America/New_York''
	),
	article_level_aggregation as materialized (
		select
			article,
			max(article_description) as article_description,
			max(l0_name) as l0_name,
			max(subbrand_code_desc) as subbrand_code_desc,
			max(l2_name) as l2_name,
			max(l3_name) as l3_name,
			max(l4_name) as l4_name,
			max(l5_name) as l5_name,
			max(l6_name) as l6_name,
			max(masterstyle_descr) as masterstyle_descr,
			max(product_lifecycle) as product_lifecycle,
			current_assortment_group,
			sum(next_po_upcoming_units)::INTEGER as next_po_upcoming_units,
			sum(demand_projection)::INTEGER as demand_projection,
			sum(oh)::INTEGER as oh,
			avg(target_wos)::INTEGER as target_wos,
			min(next_po_upcoming_date) as next_po_upcoming_date,
			sum(sales_forecast)::INTEGER as sales_forecast,
			sum(min_stock)::INTEGER as min_stock,
			sum(safety_stock_units)::INTEGER as safety_stock_units,
			avg(dc_cwos)::INTEGER as dc_cwos,
			bool_or(recommendation_flag) as recommendation_flag,
			jsonb_agg(
				jsonb_build_object(
					''dc_code'', linked_store_code,
					''next_po_upcoming_units'', next_po_upcoming_units::INTEGER,
					''demand_projection'', demand_projection::INTEGER,
					''oh'', oh::INTEGER,
					''target_wos'', target_wos::INTEGER,
					''next_po_upcoming_date'', next_po_upcoming_date,
					''sales_forecast'', sales_forecast::INTEGER,
					''min_stock'', min_stock::INTEGER,
					''safety_stock_units'', safety_stock_units::INTEGER,
					''dc_cwos'', dc_cwos::INTEGER,
					''recommendation_flag'', recommendation_flag
				)
			) as data
		from (
			select
				article,
				max(article_description) as article_description,
				max(l0_name) as l0_name,
				max(subbrand_code_desc) as subbrand_code_desc,
				max(l2_name) as l2_name,
				max(l3_name) as l3_name,
				max(l4_name) as l4_name,
				max(l5_name) as l5_name,
				max(l6_name) as l6_name,
				max(masterstyle_descr) as masterstyle_descr,
				max(product_lifecycle) as product_lifecycle,
				current_assortment_group,
				dc_code,
				linked_store_code,
				bool_or(recommendation_flag) as recommendation_flag,
				sum(oh) AS oh,
				avg(target_wos) as target_wos,
				sum(min_stock) as min_stock,
				sum(safety_stock_units) as safety_stock_units,
				SUM(next_po_upcoming_units) as next_po_upcoming_units,
				MIN(CASE WHEN next_po_upcoming_date IS NOT NULL THEN next_po_upcoming_date END) as next_po_upcoming_date,
				SUM(demand_projection) as demand_projection,
				SUM(sales_forecast) as sales_forecast,
				AVG(cwos) as dc_cwos
			from oh_query
			group by 
				article,
				current_assortment_group,
				dc_code,
				linked_store_code
		) aggregated_final
		group by article, current_assortment_group
	)
	select
		article,
		article_description,
		l0_name,
		subbrand_code_desc,
		l2_name,
		l3_name,
		l4_name,
		l5_name,
		l6_name,
		masterstyle_descr,
		product_lifecycle,
		current_assortment_group,
		next_po_upcoming_units,
		demand_projection,
		oh,
		target_wos,
		next_po_upcoming_date,
		sales_forecast,
		min_stock,
		safety_stock_units,
		dc_cwos,
		recommendation_flag,
		article IN (SELECT article FROM pre_approved_articles) as is_already_approve,
		article IN (SELECT article FROM pre_approved_articles) as checkbox_disabled,
		'|| quote_literal(_dc_transfer_code) ||' as dc_transfer_code,
		data
	from article_level_aggregation ORDER BY recommendation_flag DESC';

	_query_combine := 'SELECT * FROM (' || _query_combine || ') as subquery ';

	raise notice 'query_combine: %', _query_combine;
    open $1 for execute _query_combine;
    perform  global.sp_log(v_gen_random_uuid, 'inventory_smart.dc_transfer_list', 'Before Return',_query_combine,jsonb_build_object('product_filter', $2, 'store_filter', $3, 'meta_filters', $4));	
	return $1;

END
$function$
;
