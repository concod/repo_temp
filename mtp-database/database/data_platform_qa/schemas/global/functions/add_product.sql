--liquibase formatted sql
--changeset liquibase:add_product runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for add_product
--rollback: SELECT 1
DROP FUNCTION IF EXISTS global.add_product(input text, jsonb, integer);
CREATE OR REPLACE FUNCTION global.add_product(input text, jsonb, integer)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
	declare
	_key text;
	_value text;
	_query text;
	_keys text[] := array['product_code', 'created_by']::text[];
	_vals text[] := array[('''' || $1 || ''''), $3]::text[];
	_key_attr text;
	_value_attr text;
	_vals_attr text[];
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
		execute 'INSERT INTO "global".product_master (' || (ARRAY_TO_STRING(_keys, ', ', '')) || ') VALUES (' || (ARRAY_TO_STRING(_vals, ', ', '')) || ') returning product_code;';
		if cardinality(_vals_attr) > 0 then
			execute 'INSERT INTO "global".product_attributes (product_code, attribute_name, attribute_value) VALUES ' || (ARRAY_TO_STRING(_vals_attr, ', ', '')) || ';';
			INSERT INTO global.delta_tracker (table_name, "key") VALUES('product_master', $1);
		end if;
	end $function$
;
