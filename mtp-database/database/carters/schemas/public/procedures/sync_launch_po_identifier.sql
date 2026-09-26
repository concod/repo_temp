-- liquibase formatted sql
-- changeset shrinidhi.choragin@impactanalytics.co:sync_launch_po_identifier runOnChange:true stripComments:false splitStatements:false context:added sp labels:merge type update
-- comment: merge type update 
DROP PROCEDURE if exists public.sync_launch_po_identifier();
CREATE OR REPLACE PROCEDURE public.sync_launch_po_identifier()
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
declare
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'public.sync_launch_po_identifier';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
begin
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
 		insert into inventory_smart.launch_po_identifier (country,omnia_bulk_po_number,id)
		select country,omnia_bulk_po_number,id
		from public.launch_po_identifier
		ON CONFLICT (country, omnia_bulk_po_number) DO
    	UPDATE SET id = EXCLUDED.id;
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