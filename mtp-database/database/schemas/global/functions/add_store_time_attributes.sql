--liquibase formatted sql
--changeset liquibase:add_store_time_attributes runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for add_store_time_attributes
--rollback: SELECT 1
DROP FUNCTION IF EXISTS global.add_store_time_attributes(input jsonb);
CREATE OR REPLACE FUNCTION global.add_store_time_attributes(input jsonb)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
declare
	_key text;
	_value text;
	_attributes json;
	_attribute json;
	_store_codes varchar[];
	store_code varchar;
	_time_attrs text[];
	_ta_query text;
/*
 * Function/Procedure name: global.add_store_time_attributes.sql
 *
 * Updated_by       Updated_on      Purpose
 * ----------       -----------     --------
 * Akshay Jain      20-06-2022:    Removed deleting of already exisiting store codes data.
 *                                 Removed second input paramter since not used in SP                                       
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
				_time_attrs := array_append(_time_attrs, ('(''' || store_code || ''', ''' || (_attribute->>'attribute_name') || ''', ''' || (_attribute->>'attribute_value') || ''', ''' || (_attribute->>'start_date') || ''', ''' || (_attribute->>'end_date') || ''')'));
			end loop;
		end loop;
		execute 'INSERT INTO "global".store_time_attributes (store_code, attribute_name, attribute_value, start_time, end_time) VALUES ' || (ARRAY_TO_STRING(_time_attrs, ', ', '')) || ';';
	end
$function$
;
