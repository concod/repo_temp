--liquibase formatted sql
--changeset liquibase:get_wedge_details runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for get_wedge_details
--rollback: SELECT 1
DROP FUNCTION IF EXISTS assort.get_wedge_details(input jsonb);
CREATE OR REPLACE FUNCTION assort.get_wedge_details(input jsonb)
 RETURNS TABLE(plan_wedge_opt_id character varying, parent_wedge_id character varying, plan_code integer, l0_name text, l1_name text, l2_name text, l3_name text, channel text, cluster_code text, cluster_display_name text, drop_name text, flow_name text, attribute_value jsonb)
 LANGUAGE plpgsql
AS $function$

/*
        Function/Procedure name: assort.get_wedge_details
        Created by: Sadhana J
        Created at: 8-Mar-2022
        No of input parameter: 1
        Parameter Description : $1 = json

        Purpose: This function been created to get wedge data

        Calling Statement:

        select * from assort.get_wedge_details(
        '
        {
              "filters": [
                {
                  "attribute_name": "plan_code",
                  "value": [
                    82
                  ],
                  "operator": "in"
                },
                {
                  "attribute_name": "l0_name",
                  "value": [
                    "Bags"
                  ],
                  "prefix": "levels",
                  "operator": "in"
                },
                {
                  "attribute_name": "l1_name",
                  "value": [
                    "Backpacks/Lunch Bags"
                  ],
                  "prefix": "levels",
                  "operator": "in"
                },
                {
                  "attribute_name": "l2_name",
                  "value": [
                    "Backpacks"
                  ],
                  "prefix": "levels",
                  "operator": "in"
                },
                {
                  "attribute_name": "l3_name",
                  "value": [
                    "$115-$145"
                  ],
                  "prefix": "levels",
                  "operator": "in"
                }
              ]
            }
        '
        );

        Updated_by Updated_on Purpose
        Pradiksha K 28-07-2022: to update , flow_name added
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

                raise notice 'prefix %',_prefix;

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

        _query_combine := 'SELECT plan_wedge_opt_id, parent_wedge_id, plan_code,levels->>''l0_name'' l0_name,
                                                        levels->>''l1_name'' l1_name,
                        levels->>''l2_name'' l2_name,
                        levels->>''l3_name'' l3_name,
                        levels->>''channel'' channel,
                        levels->>''cluster_code'' cluster_code,
						levels->>''cluster_display_name'' cluster_display_name,
                        levels->>''drop'' as drop_name,
                                                levels->>''flow'' as flow_name,
                                                attribute_value::jsonb -''choice_msg'' - ''l4_msg'' attribute_value
                    FROM assort.plan_wedge_opt_master
                    ' || ' ' ||_where || ' ' ||''
                    'order by levels->>''l0_name'', levels->>''l1_name'',levels->>''l2_name'',levels->>''l3_name'',
                     levels->>''cluster_code'',
                        SUBSTRING(split_part(attribute_value->>''choice_name'', ''choice_'', 2) FROM ''([0-9]+)'')::BIGINT ASC,
                        attribute_value->>''choice_name'', levels->>''drop'''
                    ;

        raise notice '%', _query_combine;
        return QUERY execute _query_combine;

    end
$function$
;
