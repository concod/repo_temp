--liquibase formatted sql
--changeset liquibase:plan_smart_create_plan runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for plan_smart_create_plan
--rollback: SELECT 1
DROP FUNCTION IF EXISTS global.plan_smart_create_plan(jsonb);
CREATE OR REPLACE FUNCTION global.plan_smart_create_plan(jsonb)
 RETURNS integer
 LANGUAGE plpgsql
AS $function$
declare
	
declare
	_key text;
	_value text;
	_key_attr text;
	_value_attr text;
	_vals_attr text[];
    _check_columns text[];
	_input_query text;
    _plan_m_inq text := 'insert into plan_smart.plan_master (';
    _plan_m_values text := ' values(';
    _column_names text[];
    _in_planid int := 0;
    _attribute_keys text[];
    _attribute_values text[];
    _insert_attr_q text := 'insert into plan_smart.plan_attributes(plan_code,attribute_name,attribute_value) values(';
    _query text; 
    begin
        _check_columns = array['name','plan_period_sdate','plan_period_edate','compare_year','channel','created_by'];
            
        for _key, _value in SELECT * FROM jsonb_each_text($1) WHERE value IS NOT NULL loop 
			if _key = any(_check_columns) then
                _plan_m_inq := _plan_m_inq || _key || ',';
                _plan_m_values := _plan_m_values ||'''' || _value ||''''|| ',';
                raise notice '%',_value;
            else
                _attribute_keys := array_append(_attribute_keys,_key);
                _attribute_values := array_append(_attribute_values,_value);
            end if;
        end loop;
        _plan_m_inq := left(_plan_m_inq,-1);
        _plan_m_inq := _plan_m_inq || ')';
        _plan_m_values := left(_plan_m_values,-1);
        _plan_m_values := _plan_m_values || ') RETURNING plan_code;';
        _plan_m_inq := _plan_m_inq || _plan_m_values;
        --raise notice '%',_plan_m_inq;
        execute _plan_m_inq into _in_planid;
        --raise notice '%',_in_planid;
        --raise notice '%', _attribute_keys[1];
        for i in 1 .. array_upper(_attribute_keys,1)
        loop
            _query := _insert_attr_q || _in_planid || ',' ||'''' || _attribute_keys[i] ||''', '''|| _attribute_values[i]||''''||');';
            --raise notice '%',_query;
            execute _query;
        end loop;
        
        RETURN _in_planid;    

    end
$function$
;
