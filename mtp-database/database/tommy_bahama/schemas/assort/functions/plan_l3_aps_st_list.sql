--liquibase formatted sql
--changeset liquibase:plan_l3_aps_st_list runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for plan_l3_aps_st_list
--rollback: SELECT 1
DROP FUNCTION IF EXISTS assort.plan_l3_aps_st_list(input integer);
CREATE OR REPLACE FUNCTION assort.plan_l3_aps_st_list(input integer)
 RETURNS TABLE(plan_l3_aps_id integer, plan_code integer, levels jsonb, attribute_value jsonb)
 LANGUAGE plpgsql
AS $function$
declare
	_query_combine text;
	begin
		_query_combine := 'select plan_l3_aps_id, plan_code, levels, attribute_value from assort.plan_l3_aps  where plan_code  = ' || $1 ||'
order by levels->>''l1_name'',levels->>''l2_name'',levels->>''l3_name''';
		raise notice '%', _query_combine;
		RETURN QUERY execute _query_combine;
 	end
$function$

;