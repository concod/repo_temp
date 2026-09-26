--liquibase formatted sql
--changeset liquibase:MTP_27027update_depth_choice_without_recalculation runOnChange:true stripComments:false splitStatements:false context:MTP-27027 labels:liquibase_project_start
--comment: MTP-27027
--rollback: SELECT 1
DROP FUNCTION IF EXISTS assort_smart.update_depth_choice_without_recalculation(jsonb);
CREATE OR REPLACE FUNCTION assort_smart.update_depth_choice_without_recalculation(jsonb)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
declare 
_DB_query_combine text := '';
_PL_query_combine text := '';
_filterkeys text[] ;
_filtervals text[] ;
_outerkey text;
_outervalue text;
_key text;
_value text;
_Pkey text;
_Pvalue text;
_plan_code integer;
_input_json json ;
_attribute_value json;
_plan_cls_depth_id integer;
_plan_step_query text := '';
_delete_drop_query text;


begin
	/*
Function/Procedure name: assort_smart.update_depth_choice_without_recalculation
Created by: Sadhana J
Created at: 08-Mar-2022
No of input parameter: 1
Parameter Description : $1 = jsonb attribute details

Purpose: This function been created to update depth-ty and choice-ty in depth-choice

Calling Statement:

select * from assort_smart.update_depth_choice_without_recalculation(
'
{
  "cluster_depth_choice_data": [
    {
      "plan_code": 82,
      "plan_cls_depth_id": 356,
      "cluster_code": "A1",
      "attribute_value": {
        "depth_ly": 63,
        "depth_ty": 40,
        "qty_ty": 1228.3907692657506,
        "store_cnt": 2
      },
      "is_data_changed": true
    }],
  "recalculate": false
}
'
);

Updated_by Updated_on Purpose
Sadhana J 08-03-2022: To resolve the update issue in depth-choice update
*/

for _outerkey, _outervalue in SELECT * FROM jsonb_each_text($1) WHERE value IS NOT NULL loop
		if _outerkey ='cluster_depth_choice_data' then
				for _input_json in select * from jsonb_array_elements(_outervalue::jsonb)
					loop

						_plan_code = _input_json->>'plan_code';
						--raise notice '_plan_code %',_plan_code;

						_plan_cls_depth_id = _input_json->>'plan_cls_depth_id';
						--raise notice '_plan_cls_depth_id %',_plan_cls_depth_id;

						_attribute_value:= _input_json->>'attribute_value';
						--raise notice '_attribute_value %',_attribute_value;

            _delete_drop_query = 'DELETE FROM assort_smart.plan_wedge_opt_drop
                                                    WHERE plan_wedge_opt_drop_id in (select plan_wedge_opt_drop_id FROM assort_smart.plan_wedge_opt_drop where plan_code = '|| _plan_code ||')' ;
            execute _delete_drop_query;

						_PL_query_combine := 'UPDATE assort_smart.plan_cluster_depth_choice
												SET attribute_value= attribute_value::jsonb ||   '''|| _attribute_value||'''
										  WHERE plan_cls_depth_id ='||_plan_cls_depth_id||' AND plan_code='||_plan_code;
						raise notice '_PL_query_combine %',_PL_query_combine;
					   	execute _PL_query_combine;
	        	end loop;
	 	end if;
  end loop;

end
;

$function$
;
