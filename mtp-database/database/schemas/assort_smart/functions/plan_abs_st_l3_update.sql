--liquibase formatted sql
--changeset liquibase:plan_abs_st_l3_update runOnChange:true stripComments:false splitStatements:false context:MTP-31195 labels:liquibase_project_start
--comment: initial changeset for plan_abs_st_l3_update
--rollback: SELECT 1
DROP FUNCTION IF EXISTS assort_smart.plan_abs_st_l3_update(jsonb);
CREATE OR REPLACE FUNCTION assort_smart.plan_abs_st_l3_update(jsonb)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
 
 /*
         Function/Procedure name: assort_smart.plan_abs_st_l3_update
         Created by: Sadhana J
         Created at: 23-05-2022
         No of input parameter: 1
         Parameter Description : $1 = json
 w
         Purpose: This function been created to update aps st cluster data
 
         Calling Statement:
 
         select * from assort_smart.plan_abs_st_l3_update(
         '
            {
               "number_of_weeks": 7,
               "cluster_l3_aps_st_data": [
                 {
                   "plan_code": "1315",
                   "plan_l3_aps_id": 3055,
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
 _input_json jsonb ;
 _attribute_value text;
_cluster_l3_aps_st_data jsonb ;
 
 begin       
	 	_cluster_l3_aps_st_data:= (($1)->>'cluster_l3_aps_st_data')::jsonb;
         for _input_json in select jsonb_array_elements(_cluster_l3_aps_st_data::jsonb) input_json from 
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
         _query_combine:= 'UPDATE assort_smart.plan_l3_aps
 SET attribute_value= attribute_value::jsonb ||   '''|| _attribute_value||'''
 											  WHERE plan_l3_aps_id ='||_plan_l3_aps_id||' AND plan_code='||_plan_code;
 
          raise notice '%',_query_combine;
          execute _query_combine;
     end loop;
 end
 ;
 $function$
;
;
