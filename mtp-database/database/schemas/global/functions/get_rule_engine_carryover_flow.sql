--liquibase formatted sql
--changeset liquibase:get_rule_engine_carryover_flow runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for get_rule_engine_carryover_flow
--rollback: SELECT 1
DROP FUNCTION IF EXISTS global.get_rule_engine_carryover_flow(input jsonb);
CREATE OR REPLACE FUNCTION global.get_rule_engine_carryover_flow(input jsonb)
 RETURNS TABLE(rule_id integer, rule_level jsonb, priority jsonb, rule_type character varying, column_name character varying, column_value jsonb, is_active boolean)
 LANGUAGE plpgsql
AS $function$

/*
        Function/Procedure name: global.get_rule_engine_carryover_flow
        Created by: Sadhana J
        Created at: 10-Mar-2023
        No of input parameter: 1
        Parameter Description : $1 = json

        Purpose: This function been created to get rule engine carryover flow

        Calling Statement:

        select * from assort.get_wedge_attributes('{"filters":[{"attribute_name":"l0_name","value":["Bags"],"prefix":"rule_level","operator":"in"},{"attribute_name":"l1_name","value":["Handbags"],"prefix":"rule_level","operator":"in"},{"attribute_name":"l2_name","value":["Satchels"],"prefix":"rule_level","operator":"in"},{"attribute_name":"l3_name","value":["Core"],"prefix":"rule_level","operator":"in"}]}');

*/

declare
_query_combine text;
_input_json json ;
_attribute_name text;
_operator text;
_prefix text;
_value text;
_where text;

    begin
        _where:=null;

        for _input_json in select json_array_elements(value::json) input_json from
            (select value from jsonb_each_text($1::jsonb)) x

        loop

            --raise notice ' value: %', _input_json;

            _attribute_name = _input_json->>'attribute_name';
            --raise notice 'attribute_name %',_attribute_name;

            _operator = _input_json->>'operator';
            --raise notice 'operator %',_operator;

            _value = _input_json->>'value';
            _value:= REPLACE(_value, '"', '''' );
            --raise notice 'value %',_value;

            if _operator = 'in' then
                _value:= REPLACE(_value, '[', '(' );
                _value:= REPLACE(_value, ']', ')' );
            end if;

            if (_input_json->>'prefix') IS NOT null then
                _prefix = _input_json->>'prefix';

            else
                _prefix:=null;

            end if;

            --raise notice 'prefix %',_prefix;

            if _where IS NULL then
                if _prefix IS NULL then
                    _where:=  (' where '||_attribute_name || ' ' || _operator || ' ' || _value)::text;
                else
                    _where:= (' where '||_prefix||'->>'''||_attribute_name || ''' ' || _operator || ' ' || _value)::text;
                end if;
            else
                if _prefix IS NULL then
                    _where:= concat(_where, ' and '||_attribute_name|| ' ' || _operator || ' ' || _value);
                else
                    _where:= concat(_where, ' and '||_prefix||'->>'''||_attribute_name || ''' ' || _operator || ' ' || _value);
                end if;
            end if;

            --raise notice 'where  %',_where;

        end loop;

        _query_combine := 'select rule_id, rule_level, priority, rule_type, column_name, column_value, is_active 
							from "global".rule_engine_carryover_flow 
                    ' || ' ' ||_where || ' ' ||''
                    '
							order by rule_id'
                    ;

        raise notice '%', _query_combine;
        return QUERY execute _query_combine;

    end
$function$
;
