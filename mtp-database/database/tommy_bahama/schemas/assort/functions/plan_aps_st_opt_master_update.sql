--liquibase formatted sql
--changeset sadhana.jaiswal:only_update_logic runOnChange:true stripComments:false splitStatements:false context:MTP-24633 labels:liquibase_project_start
--comment: MTP-24633 and removed unused code
--rollback: SELECT 1
DROP FUNCTION IF EXISTS assort.plan_aps_st_opt_master_update(jsonb);
CREATE OR REPLACE FUNCTION assort.plan_aps_st_opt_master_update(jsonb)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
 declare
 _PL_query_combine text := '';
 _number_of_weeks float;
 _plan_code integer;
 _plan_filters jsonb;
 _input_json json ;
 _attribute_value json;
 _cluster_aps_st_data jsonb ;
  _plan_clu_aps_id text;
 -- _cntr int :=0;
 begin


 /*
         Function/Procedure name: assort_smart.plan_aps_st_opt_master_update
         Created by: Sadhana J
         Created at: 23-05-2022
         No of input parameter: 1
         Parameter Description : $1 = json

         Purpose: This function been created to update aps st cluster data

         Calling Statement:

         select * from assort_smart.plan_aps_st_opt_master_update(
         '
            {
               "number_of_weeks": 7,
               "cluster_aps_st_data": [
                 {
                   "plan_code": "1315",
                   "plan_clu_aps_id": 3055,
                   "filters": [
                     {
                       "attribute_name": "plan_code",
                       "operator": "in",
                       "value": ["1315"],
                     },
                     {
                       "attribute_name": "l0_name",
                       "value": ["Home"],
                       "prefix": "levels",
                       "operator": "in",
                     },
                     {
                       "attribute_name": "l1_name",
                       "value": ["Home"],
                       "prefix": "levels",
                       "operator": "in",
                     },
                     {
                       "attribute_name": "l2_name",
                       "value": ["Other Home"],
                       "prefix": "levels",
                       "operator": "in",
                     },
                     {
                       "attribute_name": "l3_name",
                       "value": ["< $22"],
                       "prefix": "levels",
                       "operator": "in",
                     },
                   ],
                   "attribute_value": {
                     "aps_clust_ly": 0.13835448219402377,
                     "aps_clust_ty": 0.988246301385884,
                     "st_clust_ly": 0.03724928366762178,
                     "st_clust_ty": 0.03724928366762178,
                     "avg_wk_cnt_ty": 7,
                     "max_cc": null,
                     "moq": null,
                     "cc_threshold": 1.1,
                     "st_clust_ty_changed": true,
                     "avg_wk_ty_changed": true,
                   },
                 },
               ],
             }
         '
         );

         Updated_by Updated_on Purpose
         Sadhana J 23-05-2022: to update , where-clause
 */

  _number_of_weeks:= (($1)->>'number_of_weeks')::float;
 _cluster_aps_st_data:= (($1)->>'cluster_aps_st_data')::jsonb;

 for _input_json in select * from jsonb_array_elements(_cluster_aps_st_data::jsonb)
     loop

     -- get filter, plan_code, attribute_value data from payload
     _plan_code = (_input_json->>'plan_code')::integer;
     --raise notice 'plan_code%',_plan_code;

      _plan_filters =( _input_json->>'filters')::jsonb;
      --raise notice '%',_plan_filters;
     _attribute_value:=(_input_json->>'attribute_value')::json;
     _plan_clu_aps_id =(_input_json->>'plan_clu_aps_id')::integer;
    	--raise notice '_plan_clu_aps_id%',_plan_clu_aps_id;

    _PL_query_combine := 'UPDATE assort.plan_cluster_aps
                                 SET attribute_value= attribute_value::jsonb ||
								  '''|| _attribute_value||'''
													    WHERE plan_clu_aps_id='||_plan_clu_aps_id;

	raise notice '_PL_query_combine%',_PL_query_combine;

    execute _PL_query_combine;

  end loop;

 end
 ;

 $function$
;
