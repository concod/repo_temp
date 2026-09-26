--liquibase formatted sql
--changeset samarjit.mazumder@impactanalytics.co:sync_oms_auto_allocation_scheduler stripComments:false runOnChange:true splitStatements:false context:Release_1_0 labels:briscoes_sync_oms_auto_allocation_scheduler
--comment: initial changeset for sync_oms_auto_allocation_scheduler

DROP PROCEDURE IF EXISTS public.sync_oms_auto_allocation_scheduler();

CREATE OR REPLACE PROCEDURE public.sync_oms_auto_allocation_scheduler()
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
declare
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'public.sync_oms_auto_allocation_scheduler';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
begin
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
	
	delete from inventory_smart.auto_allocation_scheduler
	where sh_code in (select distinct sh_code from public.auto_allocation_scheduler);
	
   INSERT INTO inventory_smart.auto_allocation_scheduler (
	sh_code,
	sh_name,
	sh_structure,
	sh_frequency,
	is_deleted,
	created_by,
--	created_at,
	updated_by,
--	updated_at,
	is_deletable
   )
   SELECT 
	sh_code,
	sh_name,
--	sh_structure,
	sh_structure::json AS sh_structure, 
	sh_frequency,
	is_deleted,
  	3 as created_by,
--	created_at,
	updated_by,
--	updated_at,
	is_deletable
   FROM public.auto_allocation_scheduler;
		call global.data_ingestion_logs(_log_code, _sp_name, 'end', null, (clock_timestamp() - _st)::text, null);
	exception
		when others then
	        -- Log the error if an exception occurs during any part of the procedure
	        call global.data_ingestion_logs(_log_code, _sp_name, _log_step, SQLERRM, (clock_timestamp() - _st)::text, null);
            raise exception 'Error occurred in the procedure: %', SQLERRM;
	end;
END;
$procedure$
;
