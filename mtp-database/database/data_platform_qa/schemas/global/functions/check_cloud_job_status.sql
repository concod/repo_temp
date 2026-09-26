--liquibase formatted sql
--changeset liquibase:check_cloud_job_status runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for check_cloud_job_status
--rollback: SELECT 1
DROP FUNCTION IF EXISTS global.check_cloud_job_status(request_task_id text);
CREATE OR REPLACE FUNCTION global.check_cloud_job_status(request_task_id text)
 RETURNS TABLE(task_status character varying, message character varying)
 LANGUAGE plpgsql
AS $function$
/*
Function/Procedure name:assort.check_cloud_job_status
Created by: Mohammed Ayaz
Created at: 14-Oct-2022
No of input parameter: 1
Parameter Description : $1 = task_id
Purpose: This function been created to get the task status and
            if status is pending then update to 'in-progress'
            if status is 'in-progress' throw exception
            returns the task_status, task_message records
Calling Statement:
select * from assort.check_cloud_job_status('c059dde551f746509cba31e237c27f3f');
Mohammed Ayaz: Getting task status and update status
*/
declare
_task_status text;
_update_task_status text;
_select_query text; 
 
begin
        select status into _task_status
        from "global".cloud_task_status
        where task_id = $1 limit 1;
    if _task_status ='pending' then
        _update_task_status := 'UPDATE  "global".cloud_task_status SET "status" = ''in_progress'' where task_id='''||$1||''';';
        raise notice '%', _update_task_status;
        execute _update_task_status;
    end if;
    -- get the status and msg again after (if) update
    _select_query := 'select status as task_status, message
    from "global".cloud_task_status
    where task_id = '''||$1||''';';
	raise notice '%', _select_query;
    return query execute _select_query;
end $function$
;
