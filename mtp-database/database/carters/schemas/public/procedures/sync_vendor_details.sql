-- liquibase formatted sql
-- changeset shekharkrishna.nirnakar@impactanalytics.co:sync_vendor_details runOnChange:true stripComments:false splitStatements:false context:Release_1.1 labels:sync_vendor_details
-- comment: INITIAL CHANGESET to  sync_vendor_details
 DROP PROCEDURE IF EXISTS public.sync_vendor_details();
CREATE OR REPLACE PROCEDURE public.sync_vendor_details()
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
declare
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'public.sync_vendor_details';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
begin
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
 		delete from 
 		  inventory_smart.vendor_details
 		where 
 		  true;
 		INSERT INTO inventory_smart.vendor_details (
 		  article, pack_id, dc_code, bulk_po, channel, is_pack, vendor_cd
 		) 
 		SELECT 
			article,
			pack_id,
			dc_code,
			bulk_po,
			channel,
			is_pack,
			vendor_cd
 		FROM 
 		  public.vendor_details
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