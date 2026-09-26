--liquibase formatted sql
--changeset himansh.bhardwaj:sync_newly_launched_initial_skus_alert_2 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for sync_newly_launched_initial_skus_alert_2
--rollback: SELECT 1
DROP PROCEDURE if exists public.sync_newly_launched_initial_skus_alert();
CREATE OR REPLACE PROCEDURE public.sync_newly_launched_initial_skus_alert()
 LANGUAGE plpgsql
AS $procedure$
declare
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'public.sync_newly_launched_initial_skus_alert';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
begin
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin

DELETE FROM inventory_smart.newly_launched_skus_alert WHERE TRUE;
INSERT INTO inventory_smart.newly_launched_skus_alert (allocation_plan_name,article)
select plan_code,max(0) as article
FROM
  inventory_smart.plan_master
where ((created_at - INTERVAL '12 hours 30 minutes')::date) = (NOW() AT TIME ZONE 'America/Los_Angeles')::date
and plan_code  like '%newly_launch%'
GROUP BY 1;


DELETE FROM inventory_smart.initial_allocation_alert WHERE TRUE;
INSERT INTO inventory_smart.initial_allocation_alert (allocation_plan_name,article)
select plan_code,max(0) as article
FROM
  inventory_smart.plan_master
where ((created_at - INTERVAL '12 hours 30 minutes')::date) = (NOW() AT TIME ZONE 'America/Los_Angeles')::date
and plan_code  like '%init_alloc%'
GROUP BY 1;

		call global.data_ingestion_logs(_log_code, _sp_name, 'end', null, (clock_timestamp() - _st)::text, null);
	exception
		when others then
	        -- Log the error if an exception occurs during any part of the procedure
	        call global.data_ingestion_logs(_log_code, _sp_name, _log_step, SQLERRM, (clock_timestamp() - _st)::text, null);
            raise exception 'Error occurred in the procedure: %', SQLERRM;
	end;
end
$procedure$
;
