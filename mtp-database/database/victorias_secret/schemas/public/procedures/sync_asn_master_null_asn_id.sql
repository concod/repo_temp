--liquibase formatted sql
--changeset anujkumar.singh@impactanalytics.co:sync_asn_master_null_asn_id runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:VS-105
--comment: null asn_id handeling in asn_master_null_asn_id
--rollback: SELECT 1
DROP PROCEDURE IF EXISTS public.sync_asn_master_null_asn_id();
CREATE OR REPLACE PROCEDURE public.sync_asn_master_null_asn_id()
 LANGUAGE plpgsql
AS $procedure$
declare
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'public.sync_asn_master_null_asn_id';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
begin
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
 		delete from 
 		  inventory_smart.asn_master_null_asn_id 
 		where 
 		  true;
        insert into inventory_smart.asn_master_null_asn_id (
 		  asn_code,asn_id,asn_item,po_code,po_id,po_item,requirement_date,channel,
 		  available_qty,dc_code,pack_type_id,article
 		) 
 		(
 		  SELECT 
 		  asn_code, 
 		  asn_id,
 		  asn_item,
 		  concat(po_id,'_',po_item) as po_code,
 		  po_id,
 		  po_item, 
 		  asn_delivery_date as requirement_date, 
 		  x.channel, 
 		  asn_qty as available_qty,
 		  dc.dc_code, 
 		  product_code as pack_type_id,
 		  l6_id as article
 		  FROM 
 		  public.asn_master x 
 		  join global.store_master dc on x.store_code = dc.store_code 
 		  join global.product_master pm using(product_code)
 		  join global.product_attributes_filter paf using(product_code)
 		  );
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
