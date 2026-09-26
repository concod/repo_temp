--liquibase formatted sql
--changeset mohammed.ayaz@impactanalytics.co:rollup_cluster_grade_attributes runOnChange:true stripComments:false splitStatements:false context:MTP-13310 labels:cluster_buyrollup: cluster_grade attributes SP
--comment: initial changeset for rollup_cluster_grade_attributes - add SP for rollup
--rollback: SELECT 1

DROP FUNCTION IF EXISTS cluster_smart.rollup_cluster_grade_attributes(input integer[]);
CREATE OR REPLACE FUNCTION cluster_smart.rollup_cluster_grade_attributes(plan_codes integer[])
RETURNS TABLE(store_code character varying, cluster_plan_code integer, attribute_name character varying, contribution float)
 LANGUAGE plpgsql
AS $function$
 	/*
        Function/Procedure name: cluster_smart.rollup_cluster_grade_attributes
        No of input parameter: 1
        Parameter Description : $1 = plan code 
        Purpose: This function been created to getting cluster's store data
​
        Calling Statement:
        select * from cluster_smart.rollup_cluster_grade_attributes('{335}')
​
        Mohammed Ayaz: getting cluster grade breakdown for rollup
        */
declare
	_query text := '';
	begin
		_query = '
			
		select
			store_code, cluster_plan_code, attribute_name,
			case when denom = 0 then 0 else coalesce((sales/denom),0) end as contribution
		from
		(
		select
			plan_cluster_grade_attributes.store_code,
			attribute_name,
			cluster_plan_code,
			cast(attribute_value as float) as sales,
			SUM(cast(attribute_value as float)) over (partition by store_code ,split_part(attribute_name,''__'',1)) as denom
		from cluster_smart.plan_cluster_grade_attributes
		where cluster_plan_code in  (' || (ARRAY_TO_STRING($1, ', ', '')) || ')
			and special_classification = ''product''
		group by 1,2,3, 4
		) as final_tbl;';
		raise notice '%', _query;
		return query execute _query;
	end
$function$
;
