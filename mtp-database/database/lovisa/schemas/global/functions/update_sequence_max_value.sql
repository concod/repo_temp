--liquibase formatted sql
--changeset liquibase:update_sequence_max_value runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: new function sequence_max_value
--rollback: SELECT 1
DROP FUNCTION if exists global.update_sequence_max_value;
CREATE OR REPLACE FUNCTION global.update_sequence_max_value(seq_name character varying, schema_name character varying, table_name character varying, identifier character varying)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
	declare
	_query text := '';
	max_val integer;
begin
	_query := format(
		'select max(%1$s) from %2$s.%3$s;', identifier, schema_name, table_name
		);
	raise notice 'SQL statement 1: %', _query;
	execute _query into max_val;
	
	raise notice 'Max value: %', max_val;

	_query := format(
		'SELECT setval(''%1$s.%2$s'', %3$L, true);', schema_name, seq_name, max_val + 1
		);
	raise notice 'SQL statement 2: %', _query;
	execute _query;
	
end;
$function$
;