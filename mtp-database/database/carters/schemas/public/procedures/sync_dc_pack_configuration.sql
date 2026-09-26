-- liquibase formatted sql
-- changeset aman.lakkoju:sync_dc_pack_configuration_sp_updates runOnChange:true stripComments:false splitStatements:false context:https://impactanalytics.atlassian.net/browse/CI-136 labels:sync_dc_pack_configuration_public
-- comment: sync_dc_pack_configuration_sp_updates 

DROP PROCEDURE  if exists public.sync_dc_pack_configuration();

CREATE OR REPLACE PROCEDURE public.sync_dc_pack_configuration()
 LANGUAGE plpgsql
 SECURITY DEFINER
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
 		  where 
	          true
 		;
 		INSERT INTO inventory_smart.dc_pack_configuration (
 		article,
 		pack_type_id,
 		pack_type,
 		product_code,
 		size,
        units_in_pack,
        pack_description,
        pack_size,
		org_pack_size,
        color_code,
        upc_number, 
        dim, 
        vendor_cd
 		) 
 		
select article,pack_type_id,pack_type,product_code,size,units_in_pack,pack_description, pack_size,org_pack_size,
        color_code,
        upc_number, 
        dim, 
        vendor_cd
from public.dc_pack_configuration_public a ;
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
