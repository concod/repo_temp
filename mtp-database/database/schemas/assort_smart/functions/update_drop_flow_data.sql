--liquibase formatted sql
--changeset liquibase:update_drop_flow_data runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for update_drop_flow_data
--rollback: SELECT 1
DROP FUNCTION IF EXISTS assort_smart.update_drop_flow_data(jsonb);
CREATE OR REPLACE FUNCTION assort_smart.update_drop_flow_data(jsonb)
 RETURNS void
 LANGUAGE plpgsql
AS $function$

/*
        Function/Procedure name: assort_smart.update_drop_flow_data
        Created by: Mohammed Ayaz
        Created at: 23-02-2023
        No of input parameter: 1
        Parameter Description : $1 = json

        Purpose: This function been created to update drop flow data

        Calling Statement:

                    select * from assort_smart.update_drop_flow_data('{
                    "drop_flow_data": [
                        {
                        "plan_code": "1730",
                        "attribute_value": {
                            "drop_budget_ly": 940941.2547115012,
                            "drop_budget_ty": 30858332.728295907,
                            "drop_penetration_ly": 0.9681189589740216,
                            "drop_penetration_ty": 0.969103956988802,
                            "flow_1_budget_ly": 338590.06064348016,
                            "flow_1_budget_ty": 11223398.57316597,
                            "flow_1_penetration_ly": 0.36370722527320937,
                            "flow_1_penetration_ty": 0.36370722527320937,
                            "flow_2_budget_ly": 391770.55937124125,
                            "flow_2_budget_ty": 12986196.726210047,
                            "flow_2_penetration_ly": 0.4208327403995551,
                            "flow_2_penetration_ty": 0.4208327403995551,
                            "flow_3_budget_ly": 200580.6346967798,
                            "flow_3_budget_ty": 6648737.428919893,
                            "flow_3_penetration_ly": 0.21546003432723557,
                            "flow_3_penetration_ty": 0.21546003432723557,
                            "total_budget_ly": 930941.2547115012,
                            "total_budget_ty": 30858332.728295907,
                            "total_penetration_ly": 1,
                            "total_penetration_ty": 1
                        },
                        "levels": {
                            "carryover_flag": "New",
                            "channel": "Full Line Retail",
                            "drop": "drops_2",
                            "l0_name": "Bags",
                            "l1_name": "Backpacks/Lunch Bags",
                            "l2_name": "Backpacks",
                            "l3_name": "Core"
                        }
                        }
                    ]
                    }')
*/

declare
_query_combine text := '';
_key text;
_value text;
_plan_code integer;
_levels text;
_input_json json ;
_attribute_value text;

begin       
        for _input_json in select json_array_elements(value::json) input_json from 
            (select value from jsonb_each_text($1::jsonb)) x
            
        loop
        for _key, _value in SELECT * FROM jsonb_each_text(_input_json::jsonb) --WHERE value IS NOT NULL 
                loop 
                if _key ='plan_code' then 
                 _plan_code = _value::integer;
                raise notice '%',_plan_code;
                elsif _key ='levels' then 
                    _levels = _value::text;
                elsif _key ='attribute_value' then 
                    _attribute_value:= _value::text;
                end if;
        end loop;
        _query_combine:= 'UPDATE assort_smart.plan_budget_master_drop
                            SET attribute_value = attribute_value::jsonb ||   '''|| _attribute_value||''' ,
                                levels = levels::jsonb || '''||_levels||'''
                                     WHERE  plan_code='||_plan_code;

         raise notice '%',_query_combine;
         execute _query_combine;
    end loop;
end
;
$function$
;