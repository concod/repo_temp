--liquibase formatted sql
--changeset liquibase:common_dc_review_size_list runOnChange:true stripComments:false splitStatements:false context:MTP-67855 labels:MTP-67855
--comment: DC Review Size List SP Updated
--rollback: SELECT 1

DROP FUNCTION IF EXISTS inventory_smart.dc_review_size_list(refcursor, jsonb, jsonb, varchar, jsonb);

CREATE OR REPLACE FUNCTION inventory_smart.dc_review_size_list(refcursor, jsonb, jsonb, character varying, jsonb)
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

	raise notice 'article: %', $4;

    _sa_query := global.form_main_table_filters('store_attributes_filter', $3);
    IF _sa_query IS NOT NULL AND LENGTH(TRIM(_sa_query)) > 0 THEN
		_sa_query := replace(_sa_query, 'WHERE', 'AND');
    ELSE
        _sa_query := '';
    END IF;
    raise notice '_sa_query: %', _sa_query;

    _query_meta_filters := inventory_smart.form_table_query($5); 
	raise notice '_query_meta_filters: %', _query_meta_filters;

	_query_combine := '
		WITH allocated_units AS materialized(
			SELECT * FROM inventory_smart.sku_dc_allocated_units('''', ''{' || $4 || '}'')
		),
		dc_to_dc_available_units AS materialized(
			SELECT * FROM inventory_smart.dc_to_dc_available_units(' || quote_literal($4) || ')
		),
		available_units AS materialized(
			SELECT
				dtda.product_code,
				dtda.article,
				dtda.dc_code,
				dtda.size,
				oh - COALESCE(sdru.quantity, 0) - COALESCE(sda.quantity, 0) as oh
			FROM dc_to_dc_available_units dtda
			LEFT JOIN (SELECT article, size, dc_code, SUM(quantity) AS quantity 
					FROM inventory_smart.sku_dc_reserved_units(''{' || $4 || '}'') 
					WHERE type <> ''D'' 
					GROUP BY 1,2,3) sdru
				ON dtda.article = sdru.article AND dtda.size = sdru.size 
				AND dtda.dc_code = sdru.dc_code	
			LEFT JOIN allocated_units sda 
				ON dtda.article = sda.article AND dtda.size = sda.size 
				AND dtda.dc_code = sda.dc_code				
		)
		select
			dsl."hierarchy" ->>''size'' as size,
			dsl."hierarchy" ->>''l6_name'' as article_description,
			ddt.article,
			ddt.product_code,
			paf.product_description as product_description,
			ast.order as size_order,
			bool_or(ddt.recommendation_flag) as recommendation_flag,
			jsonb_agg(
				jsonb_build_object(
					''dc_code'', saf.store_code,
					''next_po_upcoming_units'', ddt.next_po_upcoming_units,
					''demand_projection'', ddt.demand_projection::INTEGER,
					''excess_deficit_units'', ddt.excess_deficit_units,
					''excess_deficit_tag'', ddt.excess_deficit_tag,
					''oh'', COALESCE(au.oh, 0),
					''target_wos'', dsl.target_wos::INTEGER,
					''next_po_upcoming_date'', ddt.next_po_upcoming_date,
					''sales_forecast'', ddt.sales_forecast::INTEGER,
					''min_stock'', dsl.min_stock::INTEGER,
					''safety_stock_units'', COALESCE(ddt.safety_stock, 0)::INTEGER,
					''dc_cwos'', ddt.cwos::INTEGER,
					''recommendation_flag'', ddt.recommendation_flag
				)
			) as data 
		from
			inventory_smart.dc_details_table ddt
		left join available_units au
			on ddt.product_code = au.product_code 
			and ddt.dc_code = au.dc_code
			and ddt.article = au.article
		join inventory_smart.dc_service_levels dsl on
			ddt.product_code = dsl."hierarchy"->>''product_code''
			and ddt.dc_code = dsl.dc::integer
		join global.store_attributes_filter saf on
				dsl.dc::int = saf.dc_code
		join global.product_attributes_filter paf on ddt.product_code = paf.product_code
	    LEFT JOIN (
	     SELECT product_code, size, MIN("order") AS order
	     FROM inventory_smart.article_status_tag
	     GROUP BY product_code, size
	    ) ast on 
		ddt.product_code = ast.product_code
		and dsl."hierarchy" ->>''size'' = ast.size
		WHERE ddt.article = ' || quote_literal($4) || ' '|| _sa_query || 
		' group by 1,2,3,4,5,6 ORDER BY ast.order ASC ';

	_query_combine := 'SELECT * FROM (' || _query_combine || ') as subquery ' || _query_meta_filters;

	raise notice 'query_combine: %', _query_combine;
    open $1 for execute _query_combine;
    perform  global.sp_log(v_gen_random_uuid, 'inventory_smart.dc_review_size_list', 'Before Return',_query_combine,jsonb_build_object('product_filter', $2, 'store_filter', $3, 'article', $4, 'meta_filters', $5));	
	return $1;

END
$function$
;
