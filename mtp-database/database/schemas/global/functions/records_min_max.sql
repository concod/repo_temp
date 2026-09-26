--liquibase formatted sql
--changeset liquibase:records_min_max runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for records_min_max
--rollback: SELECT 1
DROP FUNCTION IF EXISTS global.records_min_max(input refcursor, character varying, character varying[]);
CREATE OR REPLACE FUNCTION global.records_min_max(input refcursor, character varying, character varying[])
 RETURNS refcursor
 LANGUAGE plpgsql
AS $function$
	declare
	_col varchar;
	_query_part_min text[] := array['''min'' as min_max_flag']::text[];
	_query_part_max text[] := array['''max'' as min_max_flag']::text[];
	_min_sql text;
	_max_sql text;
	begin
		FOREACH _col in array $3 loop
			_query_part_min := array_append(_query_part_min, ('Min(' || _col || ') AS ' || _col));
			_query_part_max := array_append(_query_part_max, ('Max(' || _col || ') AS ' || _col));
		end loop;
	_min_sql := 'SELECT ' || (ARRAY_TO_STRING(_query_part_min, ', ', '')) || ' FROM "global"."' || $2 || '"';
	_max_sql := 'SELECT ' || (ARRAY_TO_STRING(_query_part_max, ', ', '')) || ' FROM "global"."' || $2 || '"';
	raise notice '%', (_min_sql || ' UNION ALL ' || _max_sql);
 	OPEN $1 FOR execute (_min_sql || ' UNION ALL ' || _max_sql);
	RETURN $1;
	end $function$
;
