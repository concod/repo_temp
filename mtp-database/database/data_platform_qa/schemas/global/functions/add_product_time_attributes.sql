--liquibase formatted sql
--changeset liquibase:add_product_time_attributes runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for add_product_time_attributes
--rollback: SELECT 1
DROP FUNCTION IF EXISTS global.add_product_time_attributes(input jsonb);
CREATE OR REPLACE FUNCTION global.add_product_time_attributes(input jsonb)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
	declare
	_key text;
	_value text;
	_attributes json;
	_attribute json;
	_product_codes varchar[];
	product_code varchar;
	_time_attrs text[];
/*
 * Function/Procedure name: global.add_product_time_attributes.sql
 *
 * Updated_by       Updated_on      Purpose
 * ----------       -----------     --------
 * Akshay Jain      20-06-2022:    Removed deleting of already exisiting product codes data.
 *                                 Removed second input paramter since not used in SP
 */

	begin
		for _key, _value in SELECT * FROM jsonb_each_text($1) WHERE value IS NOT NULL loop 
			if _key = 'attributes' then
				_attributes := _value;
			elseif _key = 'product_codes' then
				_product_codes := replace(replace(_value, '[', '{'), ']', '}')::varchar[];
			end if;
		end loop;
		FOREACH product_code in array _product_codes loop
			for _attribute in SELECT * FROM json_array_elements(_attributes::json) loop
				_time_attrs := array_append(_time_attrs, ('(''' || product_code || ''', ''' || (_attribute->>'attribute_name') || ''', ''' || (_attribute->>'attribute_value') || ''', ''' || (_attribute->>'start_date') || ''', ''' || (_attribute->>'end_date') || ''')'));
			end loop;
		end loop;
		execute 'INSERT INTO "global".product_time_attributes (product_code, attribute_name, attribute_value, start_time, end_time) VALUES ' || (ARRAY_TO_STRING(_time_attrs, ', ', '')) || ';';
	end $function$
;
