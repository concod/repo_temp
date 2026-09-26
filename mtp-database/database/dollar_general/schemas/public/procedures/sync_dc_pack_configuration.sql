--liquibase formatted sql
--changeset rajat.choudhary:sync_dc_pack_configuration runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:003
--comment: sp change for the dc_pack_configuration according to new schema
--rollback: SELECT 1
DROP PROCEDURE IF EXISTS public.sync_dc_pack_configuration();
CREATE OR REPLACE PROCEDURE public.sync_dc_pack_configuration()
 LANGUAGE plpgsql
AS $procedure$
declare
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'public.sync_dc_pack_configuration';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
begin
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
		delete from 
		  inventory_smart.dc_pack_configuration 
		  where true
		;
		INSERT INTO inventory_smart.dc_pack_configuration (
		pack_type_id,
		pack_type,
		article,
		product_Code,
		size,
		units_in_pack
		) 
		SELECT 
		pack_type_id,
		pack_type,
		article,
		product_Code,
		size,
		units_in_pack
		from public.dc_pack_configurations
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