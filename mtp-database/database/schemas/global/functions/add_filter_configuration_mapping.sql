--liquibase formatted sql
--changeset liquibase:add_filter_configuration_mapping runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for add_filter_configuration_mapping
--rollback: SELECT 1
DROP FUNCTION IF EXISTS global.add_filter_configuration_mapping(input integer, json, integer);
CREATE OR REPLACE FUNCTION global.add_filter_configuration_mapping(input integer, json, integer)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
	declare
	_row json;
	_key text;
	_value text;
	_query text := '';
	_del_query text := 'DELETE FROM "global".filter_configurations_mapping WHERE fc_code = ' || $1 || ';';
	_update_query text := 'UPDATE "global".filter_configurations SET updated_by = ' || $3 || ', updated_at = now() WHERE fc_code = ' || $1 || ';';
	_dt text;
	_keys text[] := array['fc_code']::text[];
	_vals text[];
	_vals_list text[];
	_counter integer := 1;
	begin
		for _row in SELECT * FROM json_array_elements($2) WHERE value IS NOT NULL loop
			_vals := array[$1]::integer[];
			for _key, _value in SELECT * FROM jsonb_each_text(_row::jsonb) loop 
				-- select coalesce(max(udt_name), 'varchar') INTO _dt from information_schema.columns where table_schema = 'global' and table_name = 'filter_configurations' and column_name = _key;
				if _counter = 1 then
					_keys := array_append(_keys, _key);
				end if;
				_vals := array_append(_vals, '''' || _value || '''');
			end loop;
			_vals_list := array_append(_vals_list, '(' || (ARRAY_TO_STRING(_vals, ', ', '')) || ')');
			_vals := array[]::text[];
			_counter = _counter + 1;
		end loop;
		_query := 'INSERT INTO "global".filter_configurations_mapping (' || (ARRAY_TO_STRING(_keys, ', ', '')) || ') VALUES ' || (ARRAY_TO_STRING(_vals_list, ', ', '')) || ';';
 		-- raise notice '%',_query;
 		EXECUTE _update_query;
 		EXECUTE _del_query;
		EXECUTE _query;
	end $function$
;
