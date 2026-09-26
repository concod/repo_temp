--liquibase formatted sql
--changeset liquibase:MTP-70495 runOnChange:true stripComments:false splitStatements:false context:MTP-70495 labels:MTP-70495
--comment: MTP-70495: Added _cache_key to created MV with this name and _tuple_check to check underlying table updates
--rollback: SELECT 1
DROP FUNCTION IF EXISTS cache.wrap_sp(_schema text, _sp text, _payload jsonb, _query text, _dependencies text[], text);
DROP FUNCTION IF EXISTS cache.wrap_sp(text, text, jsonb, text, text[], text, text, boolean);
CREATE OR REPLACE FUNCTION cache.wrap_sp(_schema text, _sp text, _payload jsonb, _query text, _dependencies text[], _cache_key_pattern text, _cache_key text default '' , _tuple_check boolean DEFAULT true)
 RETURNS text
 LANGUAGE plpgsql
 PARALLEL SAFE SECURITY DEFINER
AS $function$
declare
	/*
	 * Function/Procedure name: cache.wrap_sp
	 * Created by: Ashish Gupta
	 * Created at: 19-Jul-2022
	 * No of input parameter: 6
	 * Parameter Description : 
	 * 		$1 = _schema
	 * 		$2 = _sp
	 * 		$3 = _payload
	 *	 	$4 = _query
	 * 		$5 = _dependencies
	 * 		$6 = _cache_key_pattern (Not in use for now)
	 * 		$7 = _cache_key 
	 * 		$8 = _tuple_check
	 * Purpose: This stored procedure saves the data as a materialized view and returns the cache key. 
	 			If a cache already exists for the given payload and stored procedure name, the existing cache key is returned. 
				Otherwise, a new cache key is generated and returned. If _cache_key is provided, the materialized view is created with this name; otherwise, a new UUID (gen_random_uuid()) is used.

	 * if any modification done in same function/procedure please record the changes in below format
	 *
	 *  Updated_by                  Updated_on          Purpose
	 *  ----------                  -----------         --------
		 Nibeel Yunus           	06-Feb-2025         MTP-70495: Added _cache_key to created MV with this name and _tuple_check to check underlying table updates
	*/


	_req_code int;
	_cache_key_pattern text := '{schema_name}:{sp_name}:{request}';
	_cache_table_id text;
	_cache_content jsonb;
	_cache_sp_name text := concat(_schema, '.', _sp);
	_start_time timestamp;
	_time_taken_sec numeric;
begin 
	raise notice 'Flow: wrap_sp';
	_cache_key_pattern := replace(
	  replace(
	    _cache_key_pattern, '{schema_name}', _schema
	  ), 
	  '{sp_name}', _sp
	);
	select 
	  cache.is_request_exists(
	    _payload, _cache_sp_name, 'sp', _query, 0, _tuple_check
	  ) into _req_code;
	raise notice 'Flow: wrap_sp, _req_code: %', _req_code;
	if _req_code > 0 then
		raise notice 'Flow: wrap_sp, found a cache key';
		select 
		  cache.download_request(
		    replace(
		      _cache_key_pattern, '{request}', _req_code::varchar
		    )
		  ) into _cache_content;
		_cache_table_id := (_cache_content::jsonb)->>'table';
		if not exists(select 
			  relname, 
			  relkind 
			from 
			  pg_class 
			where 
			  relname = _cache_table_id 
			  and relkind = 'm') then
			delete from "cache".request_tracker where req_code = _req_code;
			_req_code = 0;
		end if;
	end if;
	if _req_code = 0 then
		raise notice 'Flow: wrap_sp, not found a cache key';

		if _cache_key = '' then
		_cache_table_id := concat('cache_result_', gen_random_uuid());
		else 
			_cache_table_id := concat('cache_result_', _cache_key);
		end if;

		_start_time := clock_timestamp();
		execute 'CREATE MATERIALIZED VIEW "cache"."' || _cache_table_id || '" with (autovacuum_enabled=false) as ' || _query;
		_time_taken_sec := extract(epoch from clock_timestamp() - _start_time);
		perform cache.persist_request(
		  _payload, 
		  _cache_sp_name, 
		  'sp', 
		  _query,
		  _cache_key_pattern, 
		  jsonb_build_object(
		    'query', _query,
			'table', _cache_table_id,
			'time_taken', _time_taken_sec
		  )
		);
	end if;
	raise notice 'Flow: wrap_sp, return cache key';
	return _cache_table_id;
end
$function$
;