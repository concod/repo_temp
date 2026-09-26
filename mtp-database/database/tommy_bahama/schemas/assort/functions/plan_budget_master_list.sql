--liquibase formatted sql
--changeset liquibase:Update plan_budget_master_list runOnChange:true stripComments:false splitStatements:false context:MTP-43543 labels:liquibase_project_start
--comment: Added l2_name in order by
--rollback: SELECT 1
DROP FUNCTION IF EXISTS assort.plan_budget_master_list(input jsonb);
CREATE OR REPLACE FUNCTION assort.plan_budget_master_list(input jsonb)
 RETURNS TABLE(plan_budget_id integer, plan_code integer, levels jsonb, attribute_value jsonb)
 LANGUAGE plpgsql
AS $function$
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
    	_where:=(select * from assort.prepare_where_clause_from_json_filters(_filter_data) );
    
		_query_combine := 'select plan_budget_id, plan_code, levels, attribute_value  from
    							assort.plan_budget_master  ' || _where ||'
							order by levels->>''l2_name'',levels->>''channel'', cast(levels->>''fiscal_year'' as int), cast(levels->>''fiscal_month'' as int)';
		raise notice '%', _query_combine;
		RETURN QUERY execute _query_combine;
 	end
$function$
;
