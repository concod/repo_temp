--liquibase formatted sql
--changeset liquibase:update_store runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for update_store
--rollback: SELECT 1
DROP FUNCTION IF EXISTS global.update_store(input text, jsonb, integer);
CREATE OR REPLACE FUNCTION global.update_store(input text, jsonb, integer)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
	declare
		_key text;
		_value text;
		_vals text[] := array[('updated_by = ' || $3), ('updated_at = now()')]::text[];
		_key_attr text;
		_value_attr text;
		_vals_attr text[];
		_update_flag bool := false;
	begin
		for _key, _value in SELECT * FROM jsonb_each_text($2) WHERE value IS NOT NULL loop 
			if _key = 'attributes' then
				for _key_attr, _value_attr in SELECT * FROM jsonb_each_text(_value::jsonb) WHERE value IS NOT NULL loop 
					_vals_attr := array_append(_vals_attr, ('(''' || $1 || ''', ''' || _key_attr || ''', ''' || _value_attr || ''')'));
				end loop;
			else
				_vals := array_append(_vals, (_key || ' = ''' || _value || ''''));
			end if;
		end loop;
		if cardinality(_vals) > 0 then
			execute 'UPDATE "global".store_master SET ' || (ARRAY_TO_STRING(_vals, ', ', '')) || ' WHERE store_code = ''' || $1 || ''';';
			_update_flag := true;
		end if;
		if cardinality(_vals_attr) > 0 then
			execute 'DELETE FROM "global".store_attributes WHERE store_code = ''' || $1 || ''';';
			execute 'INSERT INTO "global".store_attributes (store_code, attribute_name, attribute_value) VALUES ' || (ARRAY_TO_STRING(_vals_attr, ', ', '')) || ';';
			_update_flag := true;
		end if;
		if _update_flag then
			INSERT INTO delta_tracker (table_name, "key") VALUES('store_master', $1);
		end if;
	end $function$
;
