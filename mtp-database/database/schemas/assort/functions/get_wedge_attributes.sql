--liquibase formatted sql
--changeset sadhana.j:MTP_43659_levels runOnChange:true stripComments:false splitStatements:false context:MTP-43659-levels labels:liquibase_project_start
--comment: MTP-43659-levels
--rollback: SELECT 1
DROP FUNCTION IF EXISTS assort.get_wedge_attributes(input jsonb);
CREATE OR REPLACE FUNCTION assort.get_wedge_attributes(input jsonb)
 RETURNS TABLE(attribute_name character varying, attribute_value character varying[])
 LANGUAGE plpgsql
AS $function$

 /*
         Function/Procedure name: assort.get_wedge_attributes
         Created by: Sadhana J
         Created at: 8-Mar-2022
         No of input parameter: 1
         Parameter Description : $1 = json

         Purpose: This function been created to get wedge attribute

         Calling Statement:

         select * from assort.get_wedge_attributes('{
                       "filters": [
                         {
                           "attribute_name": "plan_code",
                           "operator": "in",
                           "value": [
                             "30"
                           ]
                         }]
                     }');

         Updated_by Updated_on Purpose
         Sadhana J 24-03-2022: to update , adding again
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

         _query_combine := 'SELECT attribute_name,
                         array_agg( distinct attribute_value) as attribute_value
                     FROM assort.plan_wedge_opt_attribute
                     ' || ' ' ||_where || ' ' ||''
                     'and attribute_name not in (''Subcat'', ''subcat'', ''size_curve'', ''size'', ''l3_name'', ''l0_name'', ''l1_name'', ''l2_name'')'
                     'group by attribute_name'
                     ;
 
 
         raise notice '%', _query_combine;
         return QUERY execute _query_combine;
 
     end
 $function$
;
