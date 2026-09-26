--liquibase formatted sql
--changeset liquibase:check_add_product_time_attributes_overlap runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for check_add_product_time_attributes_overlap
--rollback: SELECT 1
DROP FUNCTION IF EXISTS global.check_add_product_time_attributes_overlap(input jsonb);
CREATE OR REPLACE FUNCTION global.check_add_product_time_attributes_overlap(input jsonb)
 RETURNS json[]
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
    _product_list json[];
    _query text;
    _product_id json;
/*
 * Function/Procedure name: global.check_add_product_time_attributes_overlap
 * Created by: Akshay Jain
 * Created at: 20-Jun-2022
 * Purpose: This function been created to validate input data before pushing into product_time_attributes table 
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
                _query := 'select json_object_agg(product_code, attribute_name) from ( select f2.product_code as product_code, attribute_name from global.product_time_attributes f2 where daterange(f2.start_time, f2.end_time, ''[]'') && daterange( '''|| (_attribute->>'start_date') || ''', '''|| (_attribute->>'end_date') ||''', ''[]'') AND product_code= ''' || product_code || ''' AND attribute_name= ''' || (_attribute->>'attribute_name') || ''') s';
                execute _query into _product_id;
                if _product_id IS NOT NULL then
                    _product_list := array_append(_product_list, _product_id);
                end if;  
			end loop;
		end loop;
        return _product_list;
	end $function$
;
