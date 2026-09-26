--liquibase formatted sql
--changeset liquibase:details_metric_store runOnChange:true stripComments:false splitStatements:false context:MTP-62853 labels:MTP-62853
--comment: MTP-62853 round wos to 2 decimal places
--rollback: SELECT 1
DROP FUNCTION IF EXISTS inventory_smart.details_metric_store(jsonb,character varying,character varying,jsonb, text);
CREATE OR REPLACE FUNCTION inventory_smart.details_metric_store(input jsonb, character varying, character varying, jsonb, text)
 RETURNS TABLE(store_code character varying, store_name character varying, it integer, oo integer, oh integer, oh_oo_it integer, wos decimal, lw_qty integer, lw_revenue real, lw_margin real, size_integrity decimal, promo_percentage decimal, aur decimal)
 LANGUAGE plpgsql
AS $function$
 declare
 	_query_sa text := '';
 	_query_table_filters text := '';
 	_query_combine text := '';
	_store_attribute_query_param jsonb := $1;
	_wos text;
	_si text;
	_table text;
	_lw_qty text;
	_dc_flag text :='';
 begin

	if $5 = 'aid' then
		_wos := 'round(wos::decimal, 2) wos';
		_si := 'round(si::decimal,2) size_integrity'; 
		_table := 'inventory_smart.article_inventory_dashboard apsl';
		_lw_qty := 'lw_qty' ;
		_dc_flag := 'and dc_flag=''false''';
	else 
		_wos := 'round((case apsl.dc_flag when false then wos else 0 end)::decimal, 2) wos';
		_si :=	'round(size_integrity::decimal, 2) size_integrity';
		_table := 'inventory_smart.alerts_product_store_level apsl';
	 	_lw_qty := 'lw_units';
		
	END IF;

	raise notice 'wos : %', _wos;
	raise notice 'si : %', _si;
	raise notice 'table: %', _table;

	-- remove store_group from store_attribute_query_param
	IF _store_attribute_query_param ? 'store_group' THEN
		_store_attribute_query_param := _store_attribute_query_param - 'store_group';
	END IF;

 	--_query_sa := global.form_attribute_table_filters_v2('store_attributes', 'store_code', $1);
 	_query_sa := global.form_main_table_filters('store_attributes_filter', _store_attribute_query_param);
 	_query_table_filters := global.form_table_query($4);
 	_query_combine = '
 		select 
 		  saf.retail_facility_code::varchar store_code, 
 		  sm.store_name, 
 		  it::int, 
 		  oo::int, 
 		  oh::int, 
 		  it::int + oo::int +oh::int oh_oo_it, 
 		  '||_wos||',
 		  '||_lw_qty||'::int, 
 		  lw_revenue::real, 
 		  lw_margin::real,
			'||_si||',
		  round(promo_percentage::decimal, 2) promo_percentage,
		  round(aur::decimal, 2) aur
 		from 
 		  '||_table||'
 		  join global.store_master sm on apsl.store_code = sm.store_code 
 		  join (select * from global.store_attributes_filter ' || _query_sa || ' and special_classification <> ''WHS'' '||_dc_flag||') saf on sm.store_code = saf.store_code 
 		--  join global.store_attributes_filter saf on sm.store_code = saf.store_code 
 		where 
 		  article = ''' || $2 || ''' 
 		  and ' || $3 || ' = 1
 		order by '||_lw_qty||' desc';
		
 		raise notice '%', 'select * from (' || _query_combine || ') X ' || _query_table_filters;
  		RETURN QUERY execute 'select * from (' || _query_combine || ') X ' || _query_table_filters;
  	end
 $function$
;