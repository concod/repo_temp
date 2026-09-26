--liquibase formatted sql
--changeset liquibase:add_fc runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for add_fc
--rollback: SELECT 1
DROP FUNCTION IF EXISTS global.add_fc(input jsonb, integer);
CREATE OR REPLACE FUNCTION global.add_fc(input jsonb, integer)
 RETURNS integer
 LANGUAGE plpgsql
AS $function$
	declare
	_key text;
	_value text;
	_query text;
	_fc_store_map_query text;
	_keys text[] := array['created_by']::text[];
	_vals text[] := array[$2]::text[];
	_store_code varchar;
	_fc_code int;
	_fc_name varchar;
	begin
		for _key, _value in SELECT * FROM jsonb_each_text($1) WHERE value IS NOT NULL loop 
			if _key = 'store_code' then
				_store_code := _value;
			else 
				_keys := array_append(_keys, _key);
				_vals := array_append(_vals, '''' || _value || '''');
			end if;
		end loop;
		_query := 'INSERT INTO "global".fulfilment_centres (' || (ARRAY_TO_STRING(_keys, ', ', '')) || ') VALUES (' || (ARRAY_TO_STRING(_vals, ', ', '')) || ') returning fc_code;';
		execute  _query into _fc_code;
		_fc_store_map_query := 'UPDATE "global".store_master SET fc_code = ' || _fc_code || ' WHERE store_code = ''' || _store_code || ''';';
		execute _fc_store_map_query;
		select name into _fc_name from "global".fulfilment_centres where fc_code = _fc_code;
		delete from "global".store_attributes where attribute_name = 'fc_name' and attribute_value = _fc_name;
		insert into "global".store_attributes(store_code, attribute_name, attribute_value) values (_store_code, 'fc_name', _fc_name);
		return _fc_code;
	end $function$
;
