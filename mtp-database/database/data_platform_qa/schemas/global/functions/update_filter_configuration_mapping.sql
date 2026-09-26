--liquibase formatted sql
--changeset liquibase:update_filter_configuration_mapping runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for update_filter_configuration_mapping
--rollback: SELECT 1
DROP FUNCTION IF EXISTS global.update_filter_configuration_mapping(input integer, text, text, jsonb, integer);
CREATE OR REPLACE FUNCTION global.update_filter_configuration_mapping(input integer, text, text, jsonb, integer)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
	declare
	_key text;
	_val text;
	_query text := '';
	-- _dt text;
	_update_query text := 'UPDATE "global".filter_configurations SET updated_by = ' || $5 || ', updated_at = now() WHERE fc_code = ' || $1 || ';';
	_vals text[];
	begin
		for _key, _val in SELECT * FROM jsonb_each_text($4) WHERE value IS NOT NULL loop 
			-- _dt := _key || ' = ''' || _val || '''';
			_vals := array_append(_vals, (_key || ' = ''' || _val || ''''));
		end loop;
		_query := 'update "global".filter_configurations_mapping SET ' || (ARRAY_TO_STRING(_vals, ', ', '')) || ' WHERE fc_code = ' || $1 || ' and dimension = ''' || $2 || ''' and column_name = ''' || $3 || ''';';
 		-- raise notice '%',_query;
 		EXECUTE _update_query;
		EXECUTE _query;
	end $function$
;
