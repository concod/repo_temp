--liquibase formatted sql
--changeset kamuju.mahaveer@impactanalytics.co:sync_ticket_type_master runOnChange:true stripComments:false splitStatements:false context:VS_inv_smart labels:VS-174
--comment: initial changeset for sync_ticket_type_master
--rollback: SELECT 1
DROP PROCEDURE IF EXISTS public.sync_ticket_type_master();
CREATE OR REPLACE PROCEDURE public.sync_ticket_type_master()
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
declare
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'public.sync_ticket_type_master';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
begin
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
		delete from 
		  inventory_smart.ticket_type_master
		where 
		  true; 

		INSERT INTO inventory_smart.ticket_type_master(
		syncstartdatetime,
		ticket_type,
		ticket_type_description,
		ticket_type_ticket_type_description
		) 
		select
		syncstartdatetime,
		ticket_type,
		ticket_type_description,
		ticket_type_ticket_type_description
		FROM 
		  public.ticket_type_master_derived;
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