--liquibase formatted sql
--changeset aman.lakkoju:sync_dc_reserve_qty runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for sync_dc_reserve_qty
--rollback: SELECT 1

DROP PROCEDURE if exists public.sync_dc_reserve_qty();
CREATE OR REPLACE PROCEDURE public.sync_dc_reserve_qty()
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
declare
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'public.sync_dc_reserve_qty';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
begin
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
    
      	insert into inventory_smart.dc_reserve_quantity_archive(
      		product_code,
      		quantity,
      		created_at,
      		"type",
      		dc_code,
      		channel,
      		reservation_till_date,
      		instock_inclusion,
      		updated_by,
      		updated_at,
      		inventory_source,
      		"comment",
      		purpose,
			incoming_po_30,
			incoming_po_31_60,
			incoming_po_61_90,
			deleted_date
      	)
		select 
      		product_code,
      		quantity,
      		created_at,
      		"type",
      		dc_code,
      		channel,
      		reservation_till_date,
      		instock_inclusion,
      		updated_by,
      		updated_at,
      		inventory_source,
      		"comment",
      		purpose,
			incoming_po_30,
			incoming_po_31_60,
			incoming_po_61_90,
			current_date as deleted_date 
		from inventory_smart.dc_reserve_quantity drq 
		where "type" ='U' and reservation_till_date < current_date;
	
		delete from inventory_smart.dc_reserve_quantity_archive 
		where deleted_date < current_date - 15;
	
		update inventory_smart.dc_reserve_quantity 
		set quantity =0,reservation_till_date = null,"comment" = 'Reservation till date is passed',purpose = null
		where "type" ='U' and reservation_till_date < current_date;
   
		insert into inventory_smart.dc_reserve_quantity(
		product_code, 
		quantity, 
		"type", 
		inventory_source , 
		dc_code ,
		channel ,
		incoming_po_30,
		incoming_po_31_60,
		incoming_po_61_90
		)
		select 
		product_code, 
		quantity, 
		"type", 
		inventory_source , 
		dc_code ,
		channel ,
		incoming_po_30,
		incoming_po_31_60,
		incoming_po_61_90
		from (
			select 
			a.product_code, 
			0 as quantity, 
			'U' as "type", 
			'DC' as inventory_source , 
			dc.dc_code, 
			a.channel,
			a.incoming_po_30,
			a.incoming_po_31_60,
			a.incoming_po_61_90
			from public.dc_reserve_qty a
			join  global.distribution_centres dc
			on a.dc_code = dc.linked_store_code 
		) x
		on conflict(product_code, dc_code,"type", inventory_source, channel)
		do update 
		set incoming_po_30 = excluded.incoming_po_30,
		incoming_po_31_60 = excluded.incoming_po_31_60,
		incoming_po_61_90 = excluded.incoming_po_61_90;
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