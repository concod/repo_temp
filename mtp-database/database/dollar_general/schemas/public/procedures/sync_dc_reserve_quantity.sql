--liquibase formatted sql
--changeset swapnil.bhange-5:sync_dc_reserve_quantity runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:dc_reserve_qty_1
--comment: added is_virtual in SP for sync_dc_reserve_quantity  
--rollback: SELECT 1
DROP PROCEDURE IF EXISTS public.sync_dc_reserve_quantity();

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
        INSERT INTO inventory_smart.dc_reserve_quantity (
            product_code,    
            quantity,
            channel,
            updated_at,
            "type",
            inventory_source,
            dc_code,
            primary_sku 
        ) 
        SELECT  
            a.product_code,
            a.quantity,
            a.channel,
            a.updated_at,
            "type",
            a.inventory_source,
            d.dc_code,
            a.primary_sku 
        from public.dc_reserve_quantity a
        join (select * from global.distribution_centres) d on cast(a.dc_code as varchar) = d.linked_store_code 
        WHERE is_virtual is false
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

