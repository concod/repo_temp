--liquibase formatted sql
--changeset liquibase:update_table_configuration runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for update_table_configuration
--rollback: SELECT 1
DROP FUNCTION IF EXISTS global.update_table_configuration(input integer, jsonb, integer);
CREATE OR REPLACE FUNCTION global.update_table_configuration(input integer, jsonb, integer)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
declare
	_key text;
	_val text;
	_query text := '';
	_vals text[];
begin
	for _key, _val in SELECT * FROM jsonb_each_text($2) WHERE value IS NOT NULL loop 
		_vals := array_append(_vals, (_key || ' = ''' || _val || ''''));
	end loop;
	_query := 'update "global".table_configurations SET updated_by = ' || $3 || ', updated_at = now(), ' || (ARRAY_TO_STRING(_vals, ', ', '')) || ' WHERE tc_code = ' || $1 || ';';
	-- raise notice '%',_query;
	EXECUTE _query;
end $function$
;
