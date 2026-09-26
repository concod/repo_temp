--liquibase formatted sql
--changeset liquibase:delete_plan_nle runOnChange:true stripComments:false splitStatements:false context:MTP-35088 labels:liquibase_project_start
--comment: initial changeset for delete_plan_nle
--rollback: SELECT 1
DROP FUNCTION IF EXISTS assort.delete_plan_nle(integer);
CREATE OR REPLACE FUNCTION assort.delete_plan_nle(integer)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
declare
_delete_query text;
   /*
    Function/Procedure name: assort.delete_plan_nle
    Created by: Hemant Kumar Singh
    Created at: 13-Feb-2024
    No of input parameter: 1
    Parameter Description : $1 = plan_code
    Purpose: This function been created to getting delete plan nle temp table  
    Calling Statement:
    SELECT assort.delete_plan_nle(5001);
    Hemant Kumar SIngh:getting delete plan nle temp table  
    */
begin
    _delete_query = 'DELETE FROM assort.temp_nle
                        WHERE plan_code=' || $1 ||' ' ;
    execute _delete_query;
end;
$function$
;
