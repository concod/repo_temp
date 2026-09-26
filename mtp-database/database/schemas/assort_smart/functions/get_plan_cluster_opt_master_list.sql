--liquibase formatted sql
--changeset hemant.kumar@impactanalytics.co:assort_smart.get_plan_cluster_opt_master_list liquibase:get_plan_cluster_opt_master_list runOnChange:true stripComments:false splitStatements:false context:MTP-21888 labels:liquibase_project_start
--comment: initial changeset for get_plan_cluster_opt_master_list
--rollback: SELECT 1
DROP FUNCTION IF EXISTS assort_smart.get_plan_cluster_opt_master_list(input jsonb);
CREATE OR REPLACE FUNCTION assort_smart.get_plan_cluster_opt_master_list(input jsonb)
 RETURNS TABLE(plan_clu_opt_id integer, plan_code integer, levels jsonb, master_attribute_value jsonb, attribute_name character varying, attribute_value jsonb)
 LANGUAGE plpgsql
AS $function$
/*
                Function/Procedure name: assort_smart.plan_cluster_opt_master_list
                Created by: Hemant Kumar Singh
                Created at: 09-Mar-2022
                Update at: 01-Apr-2022
                No of input parameter: 2
                Parameter Description : $1= filters jsonb

                Purpose: This function been created to get cluster optimization details list for 2-1 screen

                                        Calling Statement:
                                        SELECT assort_smart.get_plan_cluster_opt_master_list('{
                                          "filters": [
                                            {
                                              "attribute_name": "plan_code",
                                              "operator": "in",
                                              "value": ["237"]
                                            },
                                            {
                                              "attribute_name": "sub_channel",
                                              "value": ["Full Line Retail"],
                                              "operator": "in",
                                              "prefix":"levels"
                                            }
                                          ]
                                        }');

                Sadhana Jaiswal: updated the SP for jsonb input n dynamic where-clause
*/
declare
	_query_combine text;
	_where text;
	_input_data jsonb;
	_filter_data jsonb;
	begin
		_where:=null;
		_input_data:= $1::jsonb;
		_filter_data:=(_input_data->>'filters')::jsonb;

    	-- prepare where clause
    	_where:=(select * from assort_smart.prepare_where_clause_from_json_filters(_filter_data) );

		_query_combine := 'select pcom.plan_clu_opt_id,pcom.plan_code,pcom.levels ,pcom.attribute_value ,pcoa.attribute_name, pcoa.attribute_value  from
							    assort_smart.plan_cluster_opt_master pcom
							inner join assort_smart.plan_cluster_opt_attribute pcoa on
							    pcom.plan_clu_opt_id = pcoa.plan_clu_opt_id   
							inner join (select plan_code ,levels from assort_smart.plan_l3_opt_master 
										' || _where ||' and  is_active = ''YES''
							and levels->>''optimization_level'' = ''l3_optimization'') as active
							on pcom.levels->>''l0_name'' = active.levels->>''l0_name''
							and pcom.levels->>''l1_name'' = active.levels->>''l1_name'' 
							and pcom.levels->>''l2_name'' = active.levels->>''l2_name'' 
							and pcom.levels->>''l3_name'' = active.levels->>''l3_name'' 
							and pcom.levels->>''launch'' = active.levels->>''launch'' 
							and pcom.levels->>''channel'' = active.levels->>''channel'' 
							and pcom.levels->>''sub_channel'' = active.levels->>''sub_channel'' 
							and pcom.plan_code = active.plan_code
							order by pcom.levels';
		raise notice '%', _query_combine;
		RETURN QUERY execute _query_combine;
 	end
$function$
;
