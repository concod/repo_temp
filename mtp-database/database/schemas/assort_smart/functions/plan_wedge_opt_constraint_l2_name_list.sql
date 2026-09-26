--liquibase formatted sql
--changeset hemant.kumar@impactanalytics.co:assort_smart.plan_wedge_opt_constraint_l2_name_list liquibase:plan_wedge_opt_constraint_l2_name_list runOnChange:true stripComments:false splitStatements:false context:MTP-21857 labels:liquibase_project_start
--comment: initial changeset for plan_wedge_opt_constraint_l2_name_list
--rollback: SELECT 1
DROP FUNCTION IF EXISTS assort_smart.plan_wedge_opt_constraint_l2_name_list(input integer, text);
CREATE OR REPLACE FUNCTION assort_smart.plan_wedge_opt_constraint_l2_name_list(input integer, text)
 RETURNS TABLE(plan_wedge_opt_cons_id integer, plan_code integer, l0_name text, l1_name text, l2_name text, l3_name text, type character varying, min_value double precision, max_value double precision, increment double precision, min_size double precision,moq double precision)
 LANGUAGE plpgsql
AS $function$
/*
Function/Procedure name: assort_smart.plan_wedge_opt_constraint_l2_name_list
Created by: Hemant Kumar Singh
Created at: 13-Apr-2022
No of input parameter: 2
Parameter Description : $1,&2 = plan_code, store_type

Purpose: This function been created to get plan wedge opt constraint l2 level details

Calling Statement:
SELECT assort_smart.plan_wedge_opt_constraint_l2_name_list(107,'Full Line Retail');

Sadhana J: added into assort-smart
*/
declare
	_query_combine text;
	begin
		_query_combine := 'select
		(array_agg(plan_wedge_opt_cons_id))[1] as plan_wedge_opt_cons_id,
	(array_agg(plan_code))[1] as plan_code ,
	(array_agg(levels->>''l0_name''))[1] as l0_name,
	(array_agg(levels->>''l1_name''))[1] as l1_name,
	levels->>''l2_name'' as l2_name,
	levels->>''l3_name'' as l3_name,
	(array_agg(special_classification))[1] as type,
	avg(CAST(attribute_value->>''min_value'' AS float8)) as min_value,
	avg(CAST(attribute_value->>''max_value'' AS float8)) as max_value,
	avg(CAST(attribute_value->>''increment'' AS float8)) as increment,
	avg(CAST(attribute_value->>''min_size''  AS float8)) as min_size,
	avg(CAST(attribute_value->>''moq''  AS float8)) as moq
	from
	assort_smart.plan_wedge_opt_constraint
 	where plan_code  = ' || $1 ||' and special_classification =''' || $2 || '''
	group by
	levels->>''l2_name'',levels->>''l3_name''
	order by plan_wedge_opt_cons_id ';
		raise notice '%', _query_combine;
		RETURN QUERY execute _query_combine;
 	end
$function$
;