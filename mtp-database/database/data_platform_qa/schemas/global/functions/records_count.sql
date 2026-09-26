--liquibase formatted sql
--changeset liquibase:records_count runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for records_count
--rollback: SELECT 1
DROP FUNCTION IF EXISTS global.records_count(input text, jsonb);
CREATE OR REPLACE FUNCTION global.records_count(input text, jsonb)
 RETURNS integer
 LANGUAGE plpgsql
AS $function$
declare 
	_cnt int;
	_query_table_filters text := '';
	_table_query jsonb;
begin
	select json_object_agg(key, value) from jsonb_each_text($2) where key not in('sort', 'limit') into _table_query;
--	raise notice '%',_table_query;
	_query_table_filters := "global".form_table_query(_table_query);
--	raise notice '%','select count(1) from "global"."' || $1 || '" ' || _query_table_filters || ';';
	execute 'select count(1) from "global"."' || $1 || '"' || _query_table_filters || ';' into _cnt;
	return coalesce(_cnt, 0);
	end $function$
;
