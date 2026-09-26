--liquibase formatted sql
--changeset liquibase:gather_result runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for gather_result
--rollback: SELECT 1
DROP FUNCTION IF EXISTS cache.gather_result(input refcursor, text[], jsonb);
CREATE OR REPLACE FUNCTION cache.gather_result(input refcursor, text[], jsonb)
 RETURNS refcursor
 LANGUAGE plpgsql
AS $function$
declare
/*
 * Function/Procedure name: cache.gather_result
 * Created by: Ashish Gupta
 * Created at: 16-Dec-2022
 * No of input parameter: 3
 * Parameter Description : 
 * $1 = cursor
 * $2 = _cache_ids
 * $3 = _table_query
 * Purpose: Gather _cache_ids tables and return result with _table_query
 */
	_query_table_filters text := '';
	_out text[];
	_cache_id text;
begin 
	_query_table_filters := global.form_table_query($3);
	FOREACH _cache_id in array $2 loop
		_out := array_append(
				_out, 
		  		('select * from "cache"."' || _cache_id || '"')
			);
	end loop;
	open $1 for execute 'select * from (' || ARRAY_TO_STRING(_out, ' UNION ALL ', '') || ') X ' || _query_table_filters;
	RETURN $1;
end
$function$
;
