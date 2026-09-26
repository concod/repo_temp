-- liquibase formatted sql
-- changeset pradeep.kumar@impactanalytics.co:sync_oms_rcl_priority_mapping runOnChange:true stripComments:false splitStatements:false context:Release_1.1 labels:sync_oms_rcl_priority_mapping
-- comment: initial changeset for sync_oms_rcl_priority_mapping

DROP PROCEDURE IF EXISTS public.sync_oms_rcl_priority_mapping();
CREATE OR REPLACE PROCEDURE public.sync_oms_rcl_priority_mapping()
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
declare
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'public.sync_oms_rcl_priority_mapping';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
begin
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
		    INSERT INTO global.rcl_priority_mapping
	        (
	        "level",
		    rcl_priority,
		    module_code
	        )
	        select array_agg(level order by level) as level, rcl_priority, module_code from(
	        select  unnest(level) as level, rcl_priority, module_code from(
			select 
			cast('{' || "level" || '}' as varchar[]) as level,
		    rcl_priority, 
		    module_code
			from public.oms_rcl_priority_mapping)b)c group by 2,3;
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
