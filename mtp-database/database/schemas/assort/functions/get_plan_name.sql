--liquibase formatted sql
--changeset liquibase:get_plan_name runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for get_plan_name
--rollback: SELECT 1
DROP FUNCTION IF EXISTS assort.get_plan_name(input integer);
CREATE OR REPLACE FUNCTION assort.get_plan_name(input integer)
 RETURNS TABLE(plan_name character varying)
 LANGUAGE plpgsql
AS $function$
declare
_query_combine text;

    begin
	    /*
            Function/Procedure name: assort.get_plan_name
            Created by: Pradiksha K
            Created at: 09-Jun-2022
            No of input parameter: 1
            Parameter Description : $1 = integer plan code

            Purpose: This function been created to get plan-attribute if is_final true

            Calling Statement:

            select * from assort.plan_master(30);

            Updated_by Updated_on Purpose
            Pradiksha K 09-06-2022: to get plan-name
            */

        _query_combine := 'SELECT name as plan_name
							FROM assort.plan_master
							where plan_code = ' ||$1 || '';

        raise notice '%', _query_combine;
        return QUERY execute _query_combine;

    end
$function$
;
