--liquibase formatted sql
--changeset liquibase:add_store runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for add_store
--rollback: SELECT 1
DROP FUNCTION IF EXISTS global.add_store(input text, jsonb, integer);
CREATE OR REPLACE FUNCTION global.add_store(input text, jsonb, integer)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
declare
	_key text;
	_value text;
	_keys text[] := array['store_code', 'created_by']::text[];
	_vals text[] := array[('''' || $1 || ''''), $3]::text[];
	_key_attr text;
	_value_attr text;
	_vals_attr text[];
	_input_query text;
	begin
		for _key, _value in SELECT * FROM jsonb_each_text($2) WHERE value IS NOT NULL loop 
			if _key = 'attributes' then
				for _key_attr, _value_attr in SELECT * FROM jsonb_each_text(_value::jsonb) WHERE value IS NOT NULL loop 
					_vals_attr := array_append(_vals_attr, ('(''' || $1 || ''', ''' || _key_attr || ''', ''' || _value_attr || ''')'));
				end loop;
			else
				_keys := array_append(_keys, _key);
				_vals := array_append(_vals, '''' || _value || '''');
			end if;
		end loop;
		--_input_query:= 'INSERT INTO "global".store_master (' || (ARRAY_TO_STRING(_keys, ', ', '')) || ') VALUES (' || (ARRAY_TO_STRING(_vals, ', ', '')) || ')';
	 	--raise notice '%', _input_query;
		execute 'INSERT INTO "global".store_master (' || (ARRAY_TO_STRING(_keys, ', ', '')) || ') VALUES (' || (ARRAY_TO_STRING(_vals, ', ', '')) || ') returning store_code;';
		if cardinality(_vals_attr) > 0 then
			execute 'INSERT INTO "global".store_attributes (store_code, attribute_name, attribute_value) VALUES ' || (ARRAY_TO_STRING(_vals_attr, ', ', '')) || ';';
		 -- _input_query := 'INSERT INTO "global".store_attributes (store_code, attribute_name, attribute_value) VALUES ' || (ARRAY_TO_STRING(_vals_attr, ', ', '')) || ';';
		 raise notice '%', _input_query;
		--_input_query := 'INSERT INTO delta_tracker (table_name, "key") VALUES(''store_master'', '||$1||');';
		 raise notice '%', _input_query;
		INSERT INTO "global".delta_tracker (table_name, "key") VALUES('store_master', $1);
			
		end if;
	end
$function$
;
