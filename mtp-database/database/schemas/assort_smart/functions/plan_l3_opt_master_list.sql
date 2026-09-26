--liquibase formatted sql
--changeset hemant.kumar@impactanalytics.co:assort_smart.plan_l3_opt_master_list liquibase:plan_l3_opt_master_list runOnChange:true stripComments:false splitStatements:false context:MTP-18531 labels:liquibase_project_start
--comment: initial changeset for plan_l3_opt_master_list
--rollback: SELECT 1
DROP FUNCTION IF EXISTS assort_smart.plan_l3_opt_master_list(input jsonb);
CREATE OR REPLACE FUNCTION assort_smart.plan_l3_opt_master_list(input jsonb)
 RETURNS TABLE(plan_bud_opt_id integer, plan_code integer, levels jsonb, is_active character varying, attribute_value jsonb)
 LANGUAGE plpgsql
AS $function$
/*
Function/Procedure name: assort_smart.plan_l3_opt_master_list
Created by: Hemant Kumar Singh
Created at: 09-Mar-2022
Update at: 01-Apr-2022
No of input parameter: 1
Parameter Description : $1,$2 = jsonb

Purpose: This function been created to get l3 optimization details list for 2-1 screen

Calling Statement:
SELECT assort_smart.plan_l3_opt_master_grouping_list('{"filters":[{"attribute_name":"plan_code","value":[2349],"operator":"in"},{"attribute_name":"channel","value":["US","CA"],"prefix":"levels","operator":"in"},{"attribute_name":"is_active","value":["YES"],"operator":"in"}]}');

Sadhana J: getting l3 optimization details
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
		_query_combine := 'select plan_bud_opt_id, plan_code, levels, is_active,attribute_value from assort_smart.plan_l3_opt_master  ' || _where ||'
							order by levels->>''l1_name'',levels->>''l2_name'',levels->>''l3_name'', plan_bud_opt_id ';
		raise notice '%', _query_combine;
		RETURN QUERY execute _query_combine;
 	end
$function$
;
