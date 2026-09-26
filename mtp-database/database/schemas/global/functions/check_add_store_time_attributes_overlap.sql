--liquibase formatted sql
--changeset liquibase:check_add_store_time_attributes_overlap runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for check_add_store_time_attributes_overlap
--rollback: SELECT 1
DROP FUNCTION IF EXISTS global.check_add_store_time_attributes_overlap(input jsonb);
CREATE OR REPLACE FUNCTION global.check_add_store_time_attributes_overlap(input jsonb)
 RETURNS json[]
 LANGUAGE plpgsql
AS $function$
declare
	_key text;
	_value text;
	_attributes json;
	_attribute json;
	_store_codes varchar[];
	store_code varchar;
	_query text;
	_store_id json;
	_store_list json[];
/*
 * Function/Procedure name: global.check_add_store_time_attributes_overlap
 * Created by: Akshay Jain
 * Created at: 20-Jun-2022
 * Purpose: This function been created to validate input data before pushing into store_time_attributes table
 */  
	begin
		for _key, _value in SELECT * FROM jsonb_each_text($1) WHERE value IS NOT NULL loop 
			if _key = 'attributes' then
				_attributes := _value;
			elseif _key = 'store_codes' then
				_store_codes := replace(replace(_value, '[', '{'), ']', '}')::text[];
			end if;
		end loop;
		FOREACH store_code in array _store_codes loop
			for _attribute in SELECT * FROM json_array_elements(_attributes::json) loop
				_query := 'select json_object_agg(store_code, attribute_name) from ( select f2.store_code as store_code, attribute_name from global.store_time_attributes f2 where daterange(f2.start_time, f2.end_time, ''[]'') && daterange( '''|| (_attribute->>'start_date') || ''', '''|| (_attribute->>'end_date') ||''', ''[]'') AND store_code= ''' || store_code || ''' AND attribute_name= ''' || (_attribute->>'attribute_name') || ''') s';
				execute _query into _store_id;
                if _store_id IS NOT NULL then
                    _store_list := array_append(_store_list, _store_id);
                end if;
			end loop;
		end loop;
        return _store_list;
	end
$function$
;
