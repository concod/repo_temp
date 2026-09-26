--liquibase formatted sql
--changeset liquibase:urm_hierarchies runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:MTP-131537
--comment: combined all dimensions filters in single json
--rollback: SELECT 1
DROP FUNCTION IF EXISTS global.urm_hierarchies(refcursor, jsonb, collist character varying);
CREATE OR REPLACE FUNCTION global.urm_hierarchies(refcursor, jsonb, collist character varying)
 RETURNS refcursor
 LANGUAGE plpgsql
AS $function$
declare
	v_query text;
	v_final_query text;
	_cache_payload jsonb := jsonb_build_object('filters', cache.clean_jsonb($2), 'hierarchy', $3);
	_cache_table_id text;
	_cache_schema text := 'global';
	_cache_sp text := 'urm_hierarchies';
	_cache_key_pattern text := '{schema_name}:{sp_name}:{request}';
	_cache_dependencies text[] := '{global.product_attributes_filter,global.store_attributes_filter}';
BEGIN
	select global.products_store_filters($2) into v_query;
	v_final_query := '
		select 
		  concat(' || $3 || ') as id, 
		  a.* 
		from 
		  (
		    select 
		      ' || $3 || ' 
		    from 
		      (' || v_query || ') x 
		    group by 
		      ' || $3 ||'
		  ) a';
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
