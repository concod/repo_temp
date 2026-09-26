-- liquibase formatted sql
-- changeset kumaran.k@impactanalytics.co:sync_tb_exmd_target_folder_v5 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:sync_po_data
-- comment: derived table for sync_tb_exmd_target_folder_v5

DROP  PROCEDURE if exists public.sync_tb_exmd_target_folder();

CREATE OR REPLACE PROCEDURE public.sync_tb_exmd_target_folder()
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
declare
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'public.sync_tb_exmd_target_folder';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
begin
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
	        TRUNCATE TABLE price_promo.tb_exmd_target_folder;

	        INSERT INTO price_promo.tb_exmd_target_folder
	        (
              folder_id,
              "name",
              display_name,
              is_active,
              start_date,
              end_date
	        )
			select
              folder_id,
              "name",
              display_name,
              is_active,
              cast(start_date as date) as start_date,
              cast(end_date as date) as end_date
			from public.tb_exmd_target_folder
		;
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