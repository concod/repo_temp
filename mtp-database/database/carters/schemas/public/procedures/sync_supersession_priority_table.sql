-- liquibase formatted sql
-- changeset shrinidhi.choragi@impactanalytics.co:sync_supersession_priority_table runOnChange:true stripComments:false splitStatements:false context:Release_1.1 labels:sync_supersession_priority_table
-- comment: initial changeset for sync_supersession_priority_table
DROP PROCEDURE if exists public.sync_supersession_priority_table();
CREATE OR REPLACE PROCEDURE  public.sync_supersession_priority_table()
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
declare
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'public.sync_supersession_priority_table';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
begin
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
 		 delete from inventory_smart.supersession_priority_table
         where true;
         INSERT INTO inventory_smart.supersession_priority_table (
 		 dc_code, article, pack_type_id , final_tagging, qty , priority ) 
 		
 		SELECT dc_code, article, pack_type_id, final_tagging, qty, updated_priority as priority
	    FROM public.supersession_priority_table x;
 		 
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