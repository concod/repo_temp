--liquibase formatted sql
--changeset sadhanaj:update_sp_imagegen runOnChange:true stripComments:false splitStatements:false context:MTP-24306 labels:liquibase_project_start
--comment: MTP-24306
--rollback: SELECT 1
DROP FUNCTION IF EXISTS assort.update_plan_wedge_opt_master(jsonb);
CREATE OR REPLACE FUNCTION assort.update_plan_wedge_opt_master(jsonb)
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
_plan_wedge_opt_id text;
_is_completed boolean;
_plan_step_query text;
_image_name_url text;
_path_group text[] ;
_path text;
_path_group_new text;
_is_delete_data text;


begin

	/*
            Function/Procedure name: assort.update_plan_wedge_opt_master
            Created by: Sadhana J
            Created at: 09-Mar-2022
            No of input parameter: 1
            Parameter Description : $1 = jsonb attribute details

            Purpose: This function been created to update wedge data

            Calling Statement:

            select * from assort.update_plan_wedge_opt_master('
                {
                  "plan_wedge_data": [
                    {
                      "plan_code": 30,
                      "plan_wedge_opt_id": "40-2770",
                      "attribute_value": {
                        "color": "whi'te ",
                        "l4_msg": "",
                        "clust_qty": "22.0",
                        "choice_msg": "",
                        "choice_name": "PORSCHE---choice_3",
                        "l4_qty_rank": "",
                        "lock_choice": "No",
                        "price--band": "≤ $175 ",
                        "total_quantity": "11.0",
                        "cluster_store_count": "6"
                      }
                    }
                  ]
                }
            ');

            Updated_by Updated_on Purpose
            Sadhana J 09-03-2022: to update wedge data
            */
    _is_delete_data:= 'False';
	for _outerkey, _outervalue in SELECT * FROM jsonb_each_text($1) WHERE value IS NOT NULL loop
			if _outerkey ='plan_wedge_data' then
					for _input_json in select * from jsonb_array_elements(_outervalue::jsonb)
						loop

							_plan_code = _input_json->>'plan_code';
 							--raise notice '_plan_code %',_plan_code;
 							_image_name_url = _input_json->>'image_name_url';
 							--raise notice '_plan_code %',_plan_code;

 							_plan_wedge_opt_id = (_input_json->>'plan_wedge_opt_id')::text;
 							--raise notice '_plan_wedge_opt_id %',_plan_wedge_opt_id;

 							_attribute_value:= _input_json->>'attribute_value';
 							--raise notice '_attribute_value %',_attribute_value->>'is_image_mapped';

 							if _attribute_value->>'is_image_mapped' ='False' then
 							    _is_delete_data:= 'True';
                            	_path:= (_attribute_value->>'choice_name' || '-' || _plan_code)::text;
 								_path_group := array_append(_path_group,''''||_path::text||'''');
							end if;

							_PL_query_combine := 'UPDATE assort.plan_wedge_opt_master
 													SET image_name_url= '''|| _image_name_url||''',
                                                     attribute_value= attribute_value::jsonb ||   '''|| _attribute_value||'''
 											  WHERE plan_wedge_opt_id = '''||_plan_wedge_opt_id||'''
                                                AND plan_code='||_plan_code;

						   	execute _PL_query_combine;

		        	end loop;
		 	end if;

	  end loop;

	 if _is_delete_data ='True' then

            --raise notice '_path_group%',_path_group::text;
           _path_group_new := array_to_string(_path_group,',');

            --raise notice 'final %',_path_group;
            _PL_query_combine:= ' delete FROM assort.product_image_details
                                where attribute_name in ('|| _path_group_new||') ;
                                                ';


             --raise notice 'delete %',_PL_query_combine;
             execute _PL_query_combine;
    end if;

end;

$function$
;
