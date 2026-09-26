--liquibase formatted sql
--changeset liquibase:create_plan runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for create_plan
--rollback: SELECT 1
DROP FUNCTION IF EXISTS assort.create_plan(input jsonb, jsonb, integer);
CREATE OR REPLACE FUNCTION assort.create_plan(input jsonb, jsonb, integer)
 RETURNS TABLE(pk integer)
 LANGUAGE plpgsql
AS $function$
declare
    _key text;
    _value text;
    _query text;
    _keys text[] := array['created_by']::text[];
    _vals text[] := array[$3]::text[];
    _plan_code int;
    _key_attr text;
    _value_attr text;
    _map_attr text[];
   _level_name text;
   _level_value_arr text;
   _level_value text;
  	
    begin
        for _key, _value in SELECT * FROM jsonb_each_text($1) WHERE value IS NOT NULL loop 
            _keys := array_append(_keys, _key);
            _vals := array_append(_vals, '''' || _value || '''');
        end loop;
        _query = 'INSERT INTO "assort".plan_master (' || (ARRAY_TO_STRING(_keys, ', ', '')) || ') VALUES (' || (ARRAY_TO_STRING(_vals, ', ', '')) || ') returning plan_code;';
        execute _query into _plan_code;
        for _key_attr, _value_attr in SELECT * FROM jsonb_each_text($2) WHERE value is NOT NULL loop
        	if _key_attr = 'levels' then
        		for _level_name, _level_value_arr in select * from jsonb_each_text(_value_attr::jsonb) where value is not null loop
        			--foreach _level_value in array _level_value_arr loop 
        			_map_attr := array_append(_map_attr, ('(''' || _plan_code || ''', ''' || _level_name || ''',  '''|| _level_value_arr || ''')'));
        			--end loop;
        		end loop;
        	else	
            	_map_attr := array_append(_map_attr, ('(''' || _plan_code || ''', ''' || _key_attr || ''', ''' || _value_attr || ''')'));
        	end if;
        end loop;
        if cardinality(_map_attr) > 0 then
            execute 'INSERT INTO "assort".plan_attributes (plan_code, attribute_name, attribute_value) VALUES ' || (ARRAY_TO_STRING(_map_attr, ', ', '')) || ';';
        end if;
    return query execute ('select ' || _plan_code);
end $function$

;