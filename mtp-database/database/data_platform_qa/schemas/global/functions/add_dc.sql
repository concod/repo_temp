--liquibase formatted sql
--changeset liquibase:add_dc runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for add_dc
--rollback: SELECT 1
DROP FUNCTION IF EXISTS global.add_dc(input jsonb, integer);
CREATE OR REPLACE FUNCTION global.add_dc(input jsonb, integer)
 RETURNS integer
 LANGUAGE plpgsql
AS $function$
	declare
	_key text;
	_value text;
	_query text;
	_dc_store_map_query text;
	_keys text[] := array['created_by']::text[];
	_vals text[] := array[$2]::text[];
	_store_code varchar;
	_dc_code int;
	_dc_name varchar;
	begin
		for _key, _value in SELECT * FROM jsonb_each_text($1) WHERE value IS NOT NULL loop 
			if _key = 'store_code' then
				_store_code := _value;
			else 
				_keys := array_append(_keys, _key);
				_vals := array_append(_vals, '''' || _value || '''');
			end if;
		end loop;
		_query := 'INSERT INTO "global".distribution_centres (' || (ARRAY_TO_STRING(_keys, ', ', '')) || ') VALUES (' || (ARRAY_TO_STRING(_vals, ', ', '')) || ') returning dc_code;';
		execute _query into _dc_code;
		_dc_store_map_query := 'UPDATE "global".store_master SET dc_code = ' || _dc_code || ' WHERE store_code = ''' || _store_code || ''';';
		select name into _dc_name from "global".distribution_centres where dc_code = _dc_code;
		delete from "global".store_attributes where attribute_name = 'dc_name' and attribute_value = _dc_name;
		insert into "global".store_attributes(store_code, attribute_name, attribute_value) values (_store_code, 'dc_name', _dc_name);
		execute _dc_store_map_query;
	return _dc_code;
	end $function$
;
