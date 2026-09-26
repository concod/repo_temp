--liquibase formatted sql
--changeset liquibase:rows_count runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for rows_count
--rollback: SELECT 1
DROP FUNCTION IF EXISTS cache.rows_count(input text, jsonb);
CREATE OR REPLACE FUNCTION cache.rows_count(input text, jsonb)
 RETURNS integer
 LANGUAGE plpgsql
 PARALLEL SAFE
AS $function$
declare
/*
 * Function/Procedure name: cache.rows_count
 * Created by: Ashish Gupta
 * Created at: 19-Jul-2022
 * No of input parameter: 2
 * Parameter Description : 
 * $1 = _cache_key
 * $2 = _table_query
 * Purpose: Just count rows of a cache table with _table_query
 */
	_query_table_filters text := '';
	_cnt int;
	_table_query jsonb;
begin 
	select 
	  json_object_agg(key, value) 
	from 
	  jsonb_each_text($2) 
	where 
	  key not in('sort', 'limit') into _table_query;
	_query_table_filters := global.form_table_query(_table_query);
	execute 'select count(1) from "cache"."' || $1 || '" ' || _query_table_filters into _cnt;
	return _cnt;
end
$function$
;
