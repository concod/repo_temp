-- liquibase formatted sql
-- changeset linu.nazil@impactanalytics.co:sync_rcl_priority_mapping runOnChange:true stripComments:false splitStatements:false context:Release_1.1 labels:sync_po_master
-- comment: initial changeset for sync_rcl_priority_mapping
DROP PROCEDURE if exists public.sync_rcl_priority_mapping();
CREATE OR REPLACE PROCEDURE public.sync_rcl_priority_mapping()
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
declare
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'public.sync_rcl_priority_mapping';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
begin
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
		    INSERT INTO global.rcl_priority_mapping
	        (
	        rcl_code,
	        "level",
		    rcl_priority,
		    module_code
	        )
	        select rcl_code, array_agg(level order by level) as level, priority_rank, module_code from(
	        select rcl_code, unnest(level) as level, priority_rank, module_code from(
			select 
			rcl_code,
			cast('{' || "level" || '}' as varchar[]),
		    priority_rank, 
		    module_code
			from public.rcl_priority_mapping)b)c group by 1, 3, 4;
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