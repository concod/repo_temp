--liquibase formatted sql
--changeset sadhana.j:update_plan_wedge_opt_drop runOnChange:true stripComments:false splitStatements:false context:added_sp :liquibase_project_start
--comment: initial comment update_plan_wedge_opt_drop
--rollback: SELECT 1


DROP FUNCTION IF EXISTS assort.update_plan_wedge_opt_drop(jsonb);

CREATE OR REPLACE FUNCTION assort.update_plan_wedge_opt_drop(jsonb)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
declare
_query_combine text := '';
_key text;
_value text;
_key1 text;
_value1 text;
_plan_code integer;
_plan_wedge_opt_drop_id integer;
_plan_budget_id integer;
_drop_split text;
_choice_flow text;
_attribute_value json;
_input_json json ;
begin
        for _input_json in select json_array_elements(value::json) input_json from
            (select value from jsonb_each_text($1::jsonb)) x
        loop
        for _key, _value in SELECT * FROM jsonb_each_text(_input_json::jsonb)
                loop
                if _key ='plan_code' then
                   _plan_code = _value::integer;

                elsif _key ='plan_wedge_opt_drop_id' then
                    _plan_wedge_opt_drop_id = _value::integer;

                elsif _key ='drop_split' then
                    _drop_split = _value::varchar;
                elsif _key ='choice_flow' then
                    _choice_flow = _value::varchar;
                elsif _key ='attribute_value' then
                    _attribute_value = _value::json;
                end if;
        end loop;
        _query_combine:= 'UPDATE assort.plan_wedge_opt_drop
                                SET drop_split = '''||_drop_split||'''
								    ,choice_flow=    '''||_choice_flow||'''
									,attribute_value= '''||_attribute_value ||'''
                                WHERE plan_wedge_opt_drop_id ='||_plan_wedge_opt_drop_id||' AND plan_code='||_plan_code;

         raise notice '%',_query_combine;
         execute _query_combine;
    end loop;
end
;
$function$
;
