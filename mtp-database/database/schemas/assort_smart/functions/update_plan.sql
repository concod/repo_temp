--liquibase formatted sql
--changeset hemant.kumar@impactanalytics.co:assort_smart.update_plan runOnChange:true stripComments:false splitStatements:false context:MTP-21888 labels:liquibase_project_start
--comment: initial changeset for update_plan
--rollback: SELECT 1
DROP FUNCTION IF EXISTS assort_smart.update_plan(input integer, jsonb, jsonb, integer);
CREATE OR REPLACE FUNCTION assort_smart.update_plan(input integer, jsonb, jsonb, integer)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
declare
		_key text;
		_value text;
	    _key_attr text;
	    _value_attr text;
	    _map_attr text[];
	   	_level_name text;
	   	_level_value_arr text;
	   	_level_value text;
		_vals text[] := array[('updated_by = ' || $4), ('updated_at = now()')]::text[];
	begin
        for _key, _value in SELECT * FROM jsonb_each_text($2) WHERE value IS NOT NULL loop
            _vals := array_append(_vals, (_key || ' = ''' || _value || ''''));
        end loop;
        for _key_attr, _value_attr in SELECT * FROM jsonb_each_text($3) WHERE value is NOT NULL loop
        	if _key_attr = 'levels' then
        		for _level_name, _level_value_arr in select * from jsonb_each_text(_value_attr::jsonb) where value is not null loop
        			_map_attr := array_append(_map_attr, ('(' || $1 || ', ''' || _level_name || ''',  '''|| _level_value_arr || ''')'));
        		end loop;
        	else	
            	_map_attr := array_append(_map_attr, ('(' || $1 || ', ''' || _key_attr || ''', ''' || _value_attr || ''')'));
        	end if;
        end loop;
		if cardinality(_vals) > 0 then
			execute 'UPDATE "assort_smart".plan_master SET ' || (ARRAY_TO_STRING(_vals, ', ', '')) || ' WHERE plan_code = ''' || $1 || ''';';
		end if;
        if cardinality(_map_attr) > 0 then
        	execute 'DELETE FROM "assort_smart".plan_attributes WHERE plan_code = ''' || $1 || ''';';
            execute 'INSERT INTO "assort_smart".plan_attributes (plan_code, attribute_name, attribute_value) VALUES ' || (ARRAY_TO_STRING(_map_attr, ', ', '')) || ';';
        end if;
	end
	$function$

;