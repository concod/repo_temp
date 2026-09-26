--liquibase formatted sql
--changeset kanishka.parashar@impactanalytics.co:sync_dc_pack_configuration_v2 runOnChange:true stripComments:false splitStatements:false context:VS_inv_smart labels:VS-64
--comment: initial changeset for sync_dc_pack_configuration fix
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
		;
		INSERT INTO inventory_smart.dc_pack_configuration (
		article,
		pack_type_id,
		pack_type,
		product_code,
		size,
		units_in_pack,
		pack_description
		) 
		SELECT l7_id as article,
        product_code as pack_type_id,
        'eaches' as pack_type,
        product_code as product_code,
        size, 
        1 as units_in_pack,
        product_code as pack_description
		FROM "global".product_attributes_filter
	    where active=true and main_sku_tag=true and clearance = false;
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
