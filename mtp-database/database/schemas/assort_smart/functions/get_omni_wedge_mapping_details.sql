--liquibase formatted sql
--changeset liquibase:get_omni_wedge_mapping_details runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for get_omni_wedge_mapping_details
--rollback: SELECT 1
DROP FUNCTION IF EXISTS assort_smart.get_omni_wedge_mapping_details(input jsonb, input1 text, input2 text, input3 text);
CREATE OR REPLACE FUNCTION assort_smart.get_omni_wedge_mapping_details(input jsonb, input1 text, input2 text, input3 text)
 RETURNS TABLE(source_plan_code integer, l0_name text, l1_name text, l2_name text, l3_name text, sub_channel text, channel text, source_choice_id character varying, attribute_value jsonb, destination_plan_code integer, destination_choice_id character varying, destination_attribute_value jsonb)
 LANGUAGE plpgsql
AS $function$
 
 /*
         Function/Procedure name: assort_smart.get_omni_wedge_mapping_details
         Created by: Pradiksha K
         Created at: 8-Jun-2022
         No of input parameter: 1
         Parameter Description : $1 = json
 
         Purpose: This function been created to get wedge data
 
         Calling Statement:
 
         select * from assort_smart.get_omni_wedge_mapping_details(
         '
         {
               "filters": [
                 {
                   "attribute_name": "source_plan_code",
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
                   "prefix": "source_levels",
                   "operator": "in"
                 },
                 {
                   "attribute_name": "l1_name",
                   "value": [
                     "Backpacks/Lunch Bags"
                   ],
                   "prefix": "source_levels",
                   "operator": "in"
                 },
                 {
                   "attribute_name": "l2_name",
                   "value": [
                     "Backpacks"
                   ],
                   "prefix": "source_levels",
                   "operator": "in"
                 },
                 {
                   "attribute_name": "l3_name",
                   "value": [
                     "$115-$145"
                   ],
                   "prefix": "source_levels",
                   "operator": "in"
                 }
               ]
             }
         '
         );
 
         Updated_by Updated_on Purpose
         Pradiksha K 08-06-2022: to update , adding again
 */
 
 declare
 _query_combine text;
 _dy_select_json text;
 _dy_order_by_json text;
 _input_json json ;
 _attribute_name text;
 _operator text;
 _prefix text;
 _value text;
 _where text;
 
     begin
     	_where:=null;
       	_dy_select_json = $2;
       	_dy_order_by_json = $3;
       
 
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
       	_query_combine := 'SELECT source_plan_code,' || ' ' ||_dy_select_json || ' ' ||'
                         ,source_choice_id,
 						            attribute_value,
                         destination_plan_code,
                         destination_choice_id,
                         destination_attribute_value
                     FROM assort_smart.plan_omni_wedge_opt_master
                     ' || ' ' ||_where || ' ' ||''
                     'order by '|| ' ' ||_dy_order_by_json || ' ' ||',
                         SUBSTRING(split_part(source_choice_id, ''choice_'', 2) FROM ''([0-9]+)'')::BIGINT ASC '
                     ;
         raise notice '%', _query_combine;
         return QUERY execute _query_combine;
 
     end
 $function$
;
