--liquibase formatted sql
--changeset liquibase:update_dc runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for update_dc
--rollback: SELECT 1
DROP FUNCTION IF EXISTS global.update_dc(input integer, jsonb, integer);
CREATE OR REPLACE FUNCTION global.update_dc(input integer, jsonb, integer)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
	declare
	_key text;
	_value text;
	_query text;
	_dc_store_map_query text;
	_vals text[] := array[('updated_by = ' || $3), ('updated_at = now()')]::text[];
	_store_code varchar;
	_dc_name varchar;
	begin
		select name into _dc_name from "global".distribution_centres where dc_code = $1;
		for _key, _value in SELECT * FROM jsonb_each_text($2) WHERE value IS NOT NULL loop 
			if _key = 'store_code' then
				_store_code := _value;
			else
				_vals := array_append(_vals, (_key || ' = ''' || _value || ''''));
			end if;
		end loop;
		_query := 'UPDATE "global".distribution_centres SET ' || (ARRAY_TO_STRING(_vals, ', ', '')) || ' WHERE dc_code = ' || $1 || ';';
		execute  _query;
		execute 'UPDATE "global".store_master SET dc_code = null WHERE dc_code = ' || $1 || ';';
		_dc_store_map_query := 'UPDATE "global".store_master SET dc_code = ' || $1 || ' WHERE store_code = ''' || _store_code || ''';';
		execute _dc_store_map_query;
		select name into _dc_name from "global".distribution_centres where dc_code = $1;
		delete from "global".store_attributes where attribute_name = 'dc_name' and attribute_value = _dc_name;
		insert into store_attributes(store_code, attribute_name, attribute_value) values (_store_code, 'dc_name', _dc_name);
	end $function$
;
