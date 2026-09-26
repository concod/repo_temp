--liquibase formatted sql
--changeset liquibase:prepare_where_clause_from_json_filters_update_changeset runOnChange:true stripComments:false splitStatements:false context:update_context_to_load labels:liquibase_project_start
--comment: update changeset for prepare_where_clause_from_json_filters
--rollback: SELECT 1
DROP FUNCTION IF EXISTS assort_smart.prepare_where_clause_from_json_filters(input jsonb);
CREATE OR REPLACE FUNCTION assort_smart.prepare_where_clause_from_json_filters(input jsonb)
 RETURNS character varying
 LANGUAGE plpgsql
AS $function$

/*
        Function/Procedure name: assort_smart.prepare_where_clause_from_json_filters
        Created by: Sadhana J
        Created at: 3-08-2022
        No of input parameter: 1
        Parameter Description : $1 = json

        Purpose: This function been created to prepare_where_clause_from_json_filters
        Calling Statement:

        select * from assort_smart.prepare_where_clause_from_json_filters('[
													    {
													      "attribute_name": "plan_code",
													      "operator": "in",
													      "value": ["30"]
													    },
													    {
													      "attribute_name": "sub_channel",
													      "value": ["Full Line Retail"],
													      "operator": "in",
														  "prefix":"levels"
													    }
													  ]
												  ');


*/

declare
_input_json json ;
_filter_data json;
_attribute_name text;
_operator text;
_prefix text;
_value text;
_where text;

    begin

    _where:=null;
	--_filter_data =( $1->>'filters')::jsonb;
    --raise notice ' _filter_data: %', _filter_data;
    -- prepare where clause
    for _input_json in select * from jsonb_array_elements($1::jsonb)

    loop

        raise notice ' value: %', _input_json;

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

        --raise notice 'where_str=  %',_where;

    end loop;
    -- end prepare where clause
    raise notice '_where %',_where;
    return _where;

    end
$function$
;
