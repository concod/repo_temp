--liquibase formatted sql
--changeset gauri.nair@impactanalytics.co:sync_dc_reserve_quantity_tillys runOnChange:true stripComments:false splitStatements:false context:Release_11
--comment: adding procedure for sync_dc_reserve_quantity_tillys_test

DROP PROCEDURE if exists public.sync_dc_reserve_quantity();

CREATE OR REPLACE PROCEDURE public.sync_dc_reserve_quantity()
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
declare
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'public.sync_dc_reserve_quantity';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
begin
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
        delete from 
          inventory_smart.dc_reserve_quantity 
          where true
        ;
		insert into inventory_smart.dc_reserve_quantity (
		  product_code, quantity, channel, 
		  "type", inventory_source, dc_code, 
		  percentage, incoming_po_30, incoming_po_31_60, incoming_po_61_90, pack_type_id
		) 
		select 
		  drq.product_code, 
		  drq.quantity, 
		  drq.channel,
		  drq."type",
		  drq.inventory_source,
		  drq.dc_code,
		  drq.percentage,
		  drq.incoming_po_30,
		  drq.incoming_po_31_60,
		  drq.incoming_po_61_90,
		  drq.pack_type_id
		from 
		  public.dc_reserve_quantity drq 
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
