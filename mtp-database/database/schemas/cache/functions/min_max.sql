--liquibase formatted sql
--changeset liquibase:min_max runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for min_max
--rollback: SELECT 1
DROP FUNCTION IF EXISTS cache.min_max(input text, text[], jsonb);
CREATE OR REPLACE FUNCTION cache.min_max(input text, text[], jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
AS $function$
declare
/*
 * Function/Procedure name: cache.min_max
 * Created by: Ashish Gupta
 * Created at: 19-Jul-2022
 * No of input parameter: 3
 * Parameter Description : 
 * $1 = _cache_key
 * $2 = _cols_list
 * $3 = _table_query
 * Purpose: Just calculate min and max value of a cache table columns with _table_query
 */
	_query_table_filters text := '';
	_table_query jsonb;
	_col text;
	_out text[];
	_res jsonb;
begin 
	select 
	  json_object_agg(key, value) 
	from 
	  jsonb_each_text($3) 
	where 
	  key not in('sort', 'limit') into _table_query;
	_query_table_filters := global.form_table_query(_table_query);
	FOREACH _col in array $2 loop _out := array_append(
	  _out, 
	  (
	    'jsonb_build_object(''' || _col || ''', jsonb_build_object(''min'', min(' || _col || '), ''max'', max(' || _col || ')))'
	  )
	);
	end loop;
	execute 'select ' || (
	  ARRAY_TO_STRING(_out, ' || ', '')
	) || ' from "cache"."' || $1 || '" ' || _query_table_filters into _res;
	return _res;
end
$function$
;
