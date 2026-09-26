--liquibase formatted sql
--changeset liquibase:plan_l3_opt_l3_level_delete runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for plan_l3_opt_l3_level_delete
--rollback: SELECT 1
DROP FUNCTION IF EXISTS assort_smart.plan_l3_opt_l3_level_delete(input jsonb);
CREATE OR REPLACE FUNCTION assort_smart.plan_l3_opt_l3_level_delete(input jsonb)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
/*
Function/Procedure name: assort_smart.plan_l3_opt_master_list
Created by: Hemant Kumar Singh
Created at: 16-Jan-2023
Update at: 16-Jan-2023
No of input parameter: 1
Parameter Description : $1 = jsonb

Purpose: This function been created to deleting l3 levels data is_active flase 
 
Calling Statement:
SELECT assort_smart.plan_l3_opt_master_grouping_list('{"filters":[{"attribute_name":"plan_code","value":[2349],"operator":"in"},{"attribute_name":"channel","value":["US","CA"],"prefix":"levels","operator":"in"},{"attribute_name":"is_active","value":["YES"],"operator":"in"}]}');

Hemant Kumar SIngh: deleting l3 levels data
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
		
		_query_combine:= 'UPDATE assort_smart.plan_l3_opt_master
                                SET is_active= ''NO''
                                ' || _where ||' ;';
		raise notice '%', _query_combine;
		execute _query_combine;
 	end
$function$
;
