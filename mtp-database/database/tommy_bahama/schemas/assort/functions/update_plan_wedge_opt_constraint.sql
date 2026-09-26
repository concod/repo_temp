--liquibase formatted sql
--changeset sadhanaj:update_plan_wedge_opt_constraint runOnChange:true stripComments:false splitStatements:false context:MTP-26021 labels:liquibase_project_start
--comment: MTP-26021
--rollback: SELECT 1
DROP FUNCTION IF EXISTS assort.update_plan_wedge_opt_constraint(jsonb);


CREATE OR REPLACE FUNCTION assort.update_plan_wedge_opt_constraint(input jsonb)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
/*
 * Function/Procedure name: global.update_plan_wedge_opt_constraint
 * Created by: Kailash Yadav
 * Created at: 28-Feb-2022
 * No of input parameter: 3
 * Parameter Description : $1 = JSON consist of plan_code and levels which will be use in where clause and attribute_value
 * Purpose: This function been created to update attribute_value in plan_wedge_opt_constraint table on given value in $1 and $2
 * Calling Statement:
 * select * from assort.update_plan_wedge_opt_constraint(
    '{
	   "plan_optimization":[
	      {
	       "plan_code":30,
	            "levels":{
	                "l0_name":"Footwear",
	                "l1_name":"MNS",
	                "l2_name":"Motorsport",
	                "l3_name":"BMW",
	                "cluster_code":"A4"
	            },
	      "attribute_value":{
	            "min_value":12,
	            "max_value":2000,
	            "increment":1,
	            "min_size":1
	         }
	      }
	]
	}'
    )

 * if any modification done in same function/procedure please record the changes in below format
 *
 * Updated_by       Updated_on      Purpose
 * ----------       -----------     --------
 *
 */
declare
	_query text;
	_value text;
	_key text;
	_attr_val text;
	_cluster_code text;
	_update_query text;

	_plan_code text;

   -- _levels_value text[];
    _levels_value text[];
    _levels_key text[];


    _attr_value text;
    _value_l text;
	_key_l text;
	_level text;
	_l_value text;
	_where text;
	_input_json json ;
	_levels jsonb;
_outerkey text;
_outervalue text;

begin

	for _outerkey, _outervalue in SELECT * FROM jsonb_each_text($1) WHERE value IS NOT NULL loop
		if _outerkey ='plan_optimization' then

			for _input_json in select * from jsonb_array_elements(_outervalue::jsonb)
				loop


					    _plan_code := _input_json->>'plan_code';

					   _levels:= (_input_json->>'levels')::jsonb;


				 		for _key_l,_value_l in select * from jsonb_each_text(_levels::jsonb)
						loop

							_levels_key :=  array_append(_levels_key, 	_key_l::text) ;
							_levels_value := array_append(_levels_value, _value_l::text ) ;
						end loop;
					    _attr_value = _input_json->>'attribute_value';



						_where := '';
			        	for _level,_l_value in select unnest(_levels_key),unnest(_levels_value)
					       		loop

									_where:= concat(_where,' and levels ->>'''||_level||'''='''||_l_value||'''');
									_levels_key:= array_remove(_levels_key, _level);
									_levels_value:= array_remove(_levels_value, _l_value);
					      end loop;

		    			raise notice 'Where %',_where;


					   _update_query := 'update assort.plan_wedge_opt_constraint set
				        				  attribute_value = '''||_attr_value||'''
						 				 where plan_code = '|| _plan_code || _where;

						--raise notice ' _update_query %', _update_query;
						execute _update_query;
			        end loop;
	 		 end if;
		end loop;
end
$function$
;
