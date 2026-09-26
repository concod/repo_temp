--liquibase formatted sql
--changeset liquibase:delete_plan_omni_wedge_global_choice_opt_master runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for delete_plan_omni_wedge_global_choice_opt_master
--rollback: SELECT 1
DROP FUNCTION IF EXISTS assort.delete_plan_omni_wedge_global_choice_opt_master(source_plan_code integer, source_choice_id text);
CREATE OR REPLACE FUNCTION assort.delete_plan_omni_wedge_global_choice_opt_master(source_plan_code integer, source_choice_id text)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
declare
_delete_omni_query text;
   /*
    Function/Procedure name: assort.delete_plan_omni_wedge_global_choice_opt_master
    Created by: Hemant Kumar Singh
    Created at: 06-Jul-2022
    No of input parameter: 2
    Parameter Description : $1 = source_plan_code, &2 = source_choice_id
    Purpose: This function been created to getting delete plan omni wedge global choice   
    Calling Statement:
    SELECT assort.delete_plan_omni_wedge_opt_master(5001,1779,'false');
    Hemant Kumar SIngh:getting delete omni global choice wedge opt master
    */
begin
    _delete_omni_query = 'DELETE FROM assort.plan_omni_wedge_opt_master
                        WHERE source_plan_code=' || $1 ||'  AND source_choice_id=''' || $2 || '''' ;
    execute _delete_omni_query;
end;
$function$
;
