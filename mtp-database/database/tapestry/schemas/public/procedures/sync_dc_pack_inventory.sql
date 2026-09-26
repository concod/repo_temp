--liquibase formatted sql
--changeset samarjit.mazumder@impactanalytics.co:sync_dc_pack_inventory runOnChange:true stripComments:false splitStatements:false context:ASync_Procedures labels:briscoes_sync_dc_pack_inventory
--comment: initial changeset for sync_dc_pack_inventory
--rollback: SELECT 1

DROP PROCEDURE IF EXISTS public.sync_dc_pack_inventory();

CREATE OR REPLACE PROCEDURE public.sync_dc_pack_inventory()
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
declare
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'public.sync_dc_pack_inventory';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
begin
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
		delete from 
		  inventory_smart.dc_pack_inventory 
		where 
		  true;
		INSERT INTO inventory_smart.dc_pack_inventory (
		  product_code, article, dc_code, pack_type_id, 
		  pack_type, oh_pack_qty, oo_pack_qty, 
		  it_pack_qty, channel, sales_org_name, size
		) 
		select 
		  product_code, 
		  article, 
		  dc.dc_code, 
		  pack_type_id, 
		  pack_type, 
		  oh_pack_qty, 
		  oo_pack_qty, 
		  it_pack_qty,
		  channel,
		  sales_org_name,
		  size
		FROM 
		  public.dc_pack_inventory x 
		  join "global".store_master dc on x.dc_code = dc.store_code;
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