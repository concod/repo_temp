--liquibase formatted sql
--changeset liquibase:plan_carryover_styles_update runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for plan_carryover_styles_update
--rollback: SELECT 1
DROP FUNCTION IF EXISTS assort_smart.plan_carryover_styles_update(jsonb);
CREATE OR REPLACE FUNCTION assort_smart.plan_carryover_styles_update(jsonb)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
/*
Function/Procedure name: assort_smart.plan_carryover_styles_update
Created by: Mohammed Ayaz
Created at: 7-Jan-2023
Update at: 7-Jan-2023
No of input parameter: 1
Parameter Description : $1, input json

Purpose: This function been created to update plan_carry_over_styles for plan-review-screen


Calling Statement:
SELECT assort_smart.plan_carryover_styles_update('{"plan_carryover_data":[{"style_color_id":"23661-12209","plan_code":1831,"is_active":true,"filters":{"style":"23661","l0_name":"Bags","l1_name":"Backpacks/Lunch Bags","l2_name":"Backpacks","l3_name":"Core","color_id":"23661-12209"},"attribute_value":{"st_ly":0,"st_ty":0.6000000000000006,"aur_ly":0,"aur_ty":125.10000000000012,"cost_ly":0,"cost_ty":null,"sales_ly":0,"sales_ty":3789.1657536849984,"buy_units_ly":null,"buy_units_ty":50.48182458946174,"reg_weeks_ly":0.09615384615384616,"reg_weeks_ty":13,"sales_units_ly":0,"sales_units_ty":31,"gross_margin_ly":0,"gross_margin_ty":3368.147336608887,"retail_receipts_ly":null,"retail_receipts_ty":701.6973617935183,"gross_margin_perc_ly":0,"gross_margin_perc_ty":0.8888888888888881,"ia_recommended_sales":3789.1657536849984,"ia_recommended_sales_units":30.289094753677038}}]}');

Mohammed Ayaz:
*/
declare 
_query_combine text := '';
_filterkeys text[] ;
_filtervals text[] ;
_key text;
_value text;
_key1 text;
_value1 text;
_plan_code integer;
style_color_id text;
_input_json json ;
_attribute_value text;
_isactive text;
begin       
        for _input_json in select json_array_elements(value::json) input_json from 
            (select value from jsonb_each_text($1::jsonb)) x
            
        loop
        for _key, _value in SELECT * FROM jsonb_each_text(_input_json::jsonb) --WHERE value IS NOT NULL 
                loop 
                if _key ='plan_code' then 
                 _plan_code = _value::integer;
                raise notice '%',_plan_code;
                elsif _key ='style_color_id' then 
                    style_color_id = _value::text;
                elsif _key = 'is_active' then 
                    _isactive = _value;
                elsif _key ='filters' then 
                    for _key1, _value1 in SELECT * FROM json_each_text(_value::json)  loop 
                        _filterkeys := array_append(_filterkeys, _key1);
                        _filtervals := array_append(_filtervals, '''' || _value1 || '''');
                  end loop;
                elsif _key ='attribute_value' then 
                    _attribute_value:= _value::text;
                end if;
        end loop;
        _query_combine:= 'UPDATE assort_smart.plan_carryover_styles
								SET is_active= '''||_isactive||''',
                                attribute_value = attribute_value::jsonb || '''||_attribute_value||'''
                                WHERE plan_code='||_plan_code||' AND  levels->>''style_color_id'' ='''||style_color_id||'''' ;

         raise notice '%',_query_combine;
         execute _query_combine;
    end loop;
end
;
$function$
;
