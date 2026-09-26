--liquibase formatted sql
--changeset liquibase:get_wedge_details runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for get_wedge_details
--rollback: SELECT 1
DROP FUNCTION IF EXISTS assort_smart.get_wedge_details(input jsonb);
CREATE OR REPLACE FUNCTION assort_smart.get_wedge_details(input jsonb)
 RETURNS TABLE(plan_wedge_opt_id character varying, parent_wedge_id character varying, plan_code integer, l0_name text, l1_name text, l2_name text, l3_name text, channel text, cluster_code text, cluster_display_name text, drop_name text, flow_name text, attribute_value jsonb)
 LANGUAGE plpgsql
AS $function$

/*
        Function/Procedure name: assort_smart.get_wedge_details
        Created by: Sadhana J
        Created at: 8-Mar-2022
        No of input parameter: 1
        Parameter Description : $1 = json

        Purpose: This function been created to get wedge data

        Calling Statement:

        select * from assort_smart.get_wedge_details(
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
       * Sadhana J: added into assort-smart
*/

declare
_query_combine text;
_input_json json ;
_attribute_name text;
_operator text;
_prefix text;
_value text;
_where text;
_input_data jsonb;
_filter_data jsonb;

    begin

        _where:=null;
		_input_data:= $1::jsonb;
		_filter_data:=(_input_data->>'filters')::jsonb;

    	-- prepare where clause
    	_where:=(select * from assort_smart.prepare_where_clause_from_json_filters(_filter_data) );

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
                    FROM assort_smart.plan_wedge_opt_master
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
