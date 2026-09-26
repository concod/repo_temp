--liquibase formatted sql
--changeset liquibase:plan_code_filter runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for plan_code_filter
--rollback: SELECT 1
DROP FUNCTION IF EXISTS assort.plan_code_filter(jsonb, jsonb);
/*
    Returns plan codes matching filters.

    params :
        $1 : plan_master fields filters
        $2 : plan_attributes fields filters
    returns :
        plan_code

    Author: Pradeep Nayak
    Created : 25-Mar-2022
*/

CREATE OR REPLACE FUNCTION assort.plan_code_filter(jsonb, jsonb)
 RETURNS TABLE(plan_code integer)
 LANGUAGE plpgsql
AS $function$
declare
	_query_pm text := '';
	_query_pa text := '';
	_query_combine text;
	begin
		_query_pm := 'SELECT plan_code,is_deleted FROM "assort".plan_master' || ("assort".form_main_table_filters('plan_code', $1));
 		_query_pa := "assort".form_attribute_table_filters('plan_attributes', 'plan_code', $2);
		_query_combine := '
				select
						main.plan_code
					from
						(' || _query_pm || ') main
					JOIN (' || _query_pa || ') attributes ON
						main.plan_code = attributes.plan_code
					WHERE main.is_deleted = false
				';
		RETURN QUERY execute _query_combine;
 	end
$function$

;