--liquibase formatted sql
--changeset sadhana.j:get_plan_wedge_opt_drop_list runOnChange:true stripComments:false splitStatements:false context:added_sp :liquibase_project_start
--comment: initial comment get_plan_wedge_opt_drop_list
--rollback: SELECT 1


DROP FUNCTION IF EXISTS assort.get_plan_wedge_opt_drop_list(input integer);


CREATE OR REPLACE FUNCTION assort.get_plan_wedge_opt_drop_list(input integer)
 RETURNS TABLE(plan_wedge_opt_drop_id integer, plan_code integer, levels jsonb, drop_split boolean, choice_flow boolean, attribute_value jsonb)
 LANGUAGE plpgsql
AS $function$
declare
	_query_combine text;
	begin
		_query_combine := 'select plan_wedge_opt_drop_id, plan_code, levels, drop_split, choice_flow, attribute_value from
    							assort.plan_wedge_opt_drop  where plan_code  = ' || $1 ||'
							order by plan_wedge_opt_drop_id';
		raise notice '%', _query_combine;
		RETURN QUERY execute _query_combine;
 	end
$function$
;
