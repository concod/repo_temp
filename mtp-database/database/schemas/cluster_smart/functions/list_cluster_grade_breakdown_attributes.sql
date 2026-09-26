--liquibase formatted sql
--changeset liquibase:list_cluster_grade_breakdown_attributes runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for list_cluster_grade_breakdown_attributes
--rollback: SELECT 1
DROP FUNCTION IF EXISTS cluster_smart.list_cluster_grade_breakdown_attributes(input integer);
CREATE OR REPLACE FUNCTION cluster_smart.list_cluster_grade_breakdown_attributes(input integer)
 RETURNS TABLE(store_code character varying, attribute_name character varying, contribution float)
 LANGUAGE plpgsql
AS $function$
 	/*
        Function/Procedure name: cluster_smart.list_cluster_grade_breakdown_attributes
        No of input parameter: 1
        Parameter Description : $1 = plan code 
        Purpose: This function been created to getting cluster's store data
​
        Calling Statement:
        select * from cluster_smart.list_cluster_grade_breakdown(44);
​
        Hemant Kumar Singh: getting cluster grade breakdown attributes
        */
declare
	_query text := '';
	begin
		_query = '
			select
				 store_code, attribute_name,
				 case when denom = 0 then 0 else coalesce((sales/denom),0) end as contribution
				from
				(
				select
				  plan_cluster_grade_attributes.store_code,
				  attribute_name,
				  cast(attribute_value as float) as sales,
				  SUM(cast(attribute_value as float)) over (partition by store_code ,split_part(attribute_name,''__'',1)) as denom
				from cluster_smart.plan_cluster_grade_attributes
				where cluster_plan_code = ' || $1 ||'
				 and special_classification = ''product''
				group by 1,2,3
				) as final_tbl;';
		raise notice '%', _query;
		return query execute _query;
	end
$function$
;