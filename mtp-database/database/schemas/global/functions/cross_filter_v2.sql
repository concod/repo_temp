--liquibase formatted sql
--changeset liquibase:cross_filter_v2 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for cross_filter_v2
--rollback: SELECT 1
DROP FUNCTION IF EXISTS global.cross_filter_v2(refcursor, jsonb, jsonb, jsonb, jsonb, filter_query character varying, collist character varying[]);
CREATE OR REPLACE FUNCTION global.cross_filter_v2(refcursor, jsonb, jsonb, jsonb, jsonb, filter_query character varying, collist character varying[])
 RETURNS refcursor
 LANGUAGE plpgsql
AS $function$
declare
	v_query text;
	v_final_query text;
	_col text;
	_projection_queries text[];
	_cache_payload jsonb := jsonb_build_object('product_master', cache.clean_jsonb($2), 'product_attributes', cache.clean_jsonb($3), 'store_master', cache.clean_jsonb($4), 'store_attributes', cache.clean_jsonb($5), 'filter_query', $6, 'hierarchy', $7);
	_cache_table_id text;
	_cache_schema text := 'global';
	_cache_sp text := 'cross_filter_test_v1';
	_cache_key_pattern text := '{schema_name}:{sp_name}:{request}';
	_cache_dependencies text[] := '{global.product_attributes_filter,global.store_attributes_filter,global.product_mapping_product_store}';
begin
	$3 := case when $3->>'l0_name' is null then $3 || '{"l0_name":[]}' else $3 end;
	select global.products_store_filters($2,$3,$4,$5) into v_query;
	raise notice 'v_query%',v_query;

	foreach _col in array $7 loop
		_projection_queries := array_append(
			_projection_queries, 
			'array_agg(distinct ' || _col || ') as ' || _col || '');
	end loop;

	v_final_query := '
	with product_store_filter_initial as (
		' || v_query || '
	)
	'||filter_query||'
	,final_query as (
		select ' || ARRAY_TO_STRING(_projection_queries, ', ', '') || ' from product_store_filter
	)
	select * from final_query';
	raise notice '%', v_final_query;
	select
	  * 
	from 
	  cache.wrap_sp(
		_cache_schema, 
		_cache_sp, 
		_cache_payload, 
		v_final_query, 
		_cache_dependencies, 
		_cache_key_pattern
	  ) into _cache_table_id;
	perform set_config(
	  'myvars.cache_table_id', _cache_table_id, 
	  true
	);
	open $1 for execute 'select * from "cache"."' || _cache_table_id || '" X ';
	RETURN $1;
end
$function$
;
