--liquibase formatted sql
--changeset mahesh.nv:details_metric runOnChange:true stripComments:false splitStatements:false context:MTP-64512 labels:MTP-64512
--comment: MTP-64512 initial-comment
--rollback: SELECT 1
DROP FUNCTION IF EXISTS inventory_smart.details_metric(refcursor, jsonb, jsonb, jsonb);
CREATE OR REPLACE FUNCTION inventory_smart.details_metric(input refcursor, product_attributes jsonb, store_attributes jsonb, table_filters jsonb)
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

    _query_combine := FORMAT($$
    
		WITH ph_data as (
			select distinct article,style_name from global.product_attributes_filter paf
			%s
		)
		,aid AS 
			(
			SELECT
				aid.article,
				lw_units as lw_qty,
				lw_revenue,
				lw_margin,
				promo_percentage,
				aur,
				oh,
				oo,
				it,
				stockout,
				shortfall,
				excess,
				normal,
				wos_oh_it,
				wos_oh,
				wos,
				l0_name,
				l1_name,
				l2_name,
				l3_name,
				l4_name,
				l5_name,
				style_name,
				tot_inv,
				si,
				oh_dc,
				product_type,
				saf.special_classification
			FROM
				inventory_smart.article_inventory_dashboard aid
				join ph_data using (article)
			join global.store_attributes_filter saf on aid.store_code =saf.store_code
				),
		str_metrics AS
			(
			SELECT
				article,
				CAST(ROUND(SUM(COALESCE(lw_qty, 0))) AS INTEGER) AS lw_qty,
				ROUND(SUM(COALESCE(lw_revenue, 0))::numeric, 2) AS lw_revenue,
				ROUND(SUM(COALESCE(lw_margin, 0))::numeric, 2) AS lw_margin,
				ROUND(AVG(COALESCE(promo_percentage, 0) * 100)::numeric, 2) AS promo_percentage,
				ROUND(AVG(COALESCE(si , 0) * 100)::numeric, 2) AS si,
				ROUND(AVG(COALESCE(aur , 0))::numeric, 2) AS aur,
				CAST(ROUND(SUM(COALESCE(oh, 0))) AS INTEGER) AS oh,
				CAST(ROUND(SUM(COALESCE(oo, 0))) AS INTEGER) AS oo,
				CAST(ROUND(SUM(COALESCE(it, 0))) AS INTEGER) AS it,
				CAST(ROUND(SUM(COALESCE(tot_inv, 0))) AS INTEGER) AS tot_inv,
				ROUND(AVG(COALESCE(wos_oh_it , 0))::numeric, 2) AS wos_oh_it,
				ROUND(AVG(COALESCE(wos_oh , 0))::numeric, 2) AS wos_oh,
				ROUND(AVG(COALESCE(wos , 0))::numeric, 2) AS wos,
				CAST(ROUND(SUM(COALESCE(stockout, 0))) AS INTEGER) AS stockout,
				CAST(ROUND(SUM(COALESCE(shortfall, 0))) AS INTEGER) AS shortfall,
				CAST(ROUND(SUM(COALESCE(excess, 0))) AS INTEGER) AS excess,
				CAST(ROUND(SUM(COALESCE(normal, 0))) AS INTEGER) AS normal
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
			a.l5_name,
			style_name,
			a.product_type,
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
			COALESCE(b.excess, 0) AS excess	
		FROM
			aid a
		LEFT JOIN
			str_metrics b USING(article)
			left join dc_metrics c using(article)
			where special_classification='STORE'
 and c.oh_dc > 0
	$$, _query_pa_sa);
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
	
	perform  global.sp_log(v_gen_random_uuid, 'inventory_smart.details_metric', 'Before returning function value',null,jsonb_build_object('product_attributes',product_attributes,'store_attributes',store_attributes,'table_filters',table_filters));

    RETURN input;
END
$function$;