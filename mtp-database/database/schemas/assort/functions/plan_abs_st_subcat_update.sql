--liquibase formatted sql
--changeset liquibase:plan_abs_st_subcat_update runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for plan_abs_st_subcat_update
--rollback: SELECT 1
DROP FUNCTION IF EXISTS assort.plan_abs_st_subcat_update(jsonb);
CREATE OR REPLACE FUNCTION assort.plan_abs_st_subcat_update(jsonb)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
declare 
_query_combine text := '';
_filterkeys text[] ;
_filtervals text[] ;
_key text;
_value text;
_key1 text;
_value1 text;
_plan_code integer;
_plan_l3_aps_id integer;
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
                elsif _key ='plan_l3_aps_id' then 
                    _plan_l3_aps_id = _value::integer;
                elsif _key ='attribute_value' then 
                    _attribute_value:= _value::text;
                end if;
        end loop;
        _query_combine:= 'UPDATE assort.plan_l3_aps
SET attribute_value= attribute_value::jsonb ||   '''|| _attribute_value||'''
											  WHERE plan_l3_aps_id ='||_plan_l3_aps_id||' AND plan_code='||_plan_code;

         raise notice '%',_query_combine;
         execute _query_combine;
    end loop;
end
;
$function$

;