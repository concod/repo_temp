--liquibase formatted sql
--changeset liquibase:create_plan runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for create_plan
--rollback: SELECT 1
DROP FUNCTION IF EXISTS inventory_smart.create_plan(jsonb, jsonb, integer);
DROP FUNCTION IF EXISTS inventory_smart.create_plan(jsonb, jsonb, integer, boolean);
CREATE OR REPLACE FUNCTION inventory_smart.create_plan(jsonb, jsonb, integer, boolean DEFAULT false)
 RETURNS TABLE(plan_code character varying)
 LANGUAGE plpgsql
AS $function$
declare
    _key text;
    _value text;
    _query text;
    _keys text[] := array['created_by']::text[];
    _vals text[] := array[$3]::text[];
    _plan_code varchar;
    _key_attr text;
    _value_attr text;
    _map_attr text[];
    _level_name text;
    _level_value_arr text;
    _level_value text;
    _tmp_plan_code varchar;
    _delete_attr_query text;
    _delete_master_query text;
    _partial_finalize boolean := $4;
    begin
        for _key, _value in SELECT * FROM jsonb_each_text($1) WHERE value IS NOT NULL loop 
            _keys := array_append(_keys, _key);
            _vals := array_append(_vals, '''' || _value || '''');
        end loop;
        if _partial_finalize then
            --fetch plan_code from $1 by using jsonb_each_text($1)
            _tmp_plan_code = $1->>'plan_code';
            raise notice 'Plan code: %', _tmp_plan_code;
            _plan_code = _tmp_plan_code;
            _delete_attr_query = 'delete from inventory_smart.plan_attributes pa where plan_code = ''' || _tmp_plan_code || '''';
            execute _delete_attr_query;
        else 
            _query = 'INSERT INTO "inventory_smart".plan_master (' || (ARRAY_TO_STRING(_keys, ', ', '')) || ') VALUES (' || (ARRAY_TO_STRING(_vals, ', ', '')) || ') returning plan_code;';
            _tmp_plan_code =  _vals[4] ;
            _delete_attr_query = 'delete from inventory_smart.plan_attributes pa where plan_code = ' ||''|| _tmp_plan_code||'';
            _delete_master_query = 'delete from inventory_smart.plan_master pm where plan_code = ' ||''|| _tmp_plan_code||'';
            execute _delete_attr_query;
            execute _delete_master_query;
            execute _query into _plan_code;
            raise notice 'Plan code: %', _plan_code;
        end if;
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
            execute 'INSERT INTO "inventory_smart".plan_attributes (plan_code, attribute_name, attribute_value) VALUES ' || (ARRAY_TO_STRING(_map_attr, ', ', '')) || ';';
        end if;
        ----- cache handler will come here -----
		perform cache.update_dependencies('inventory_smart.plan_master');
		----------------------------------------
	 return query execute ('select ''' || _plan_code||'''::varchar as plan_code ');
end $function$
;
