--liquibase formatted sql
--changeset samarjit.mazumder@impactanalytics.co:sync_dc_reserve_qty_v1 runOnChange:true stripComments:false splitStatements:false context:ASync_Procedures labels:briscoes_sync_dc_reserve_qty_v1
--comment: initial changeset for sync_dc_reserve_qty_v1
--rollback: SELECT 1
DROP PROCEDURE IF EXISTS public.sync_dc_reserve_qty();
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
      		---------------Newly added
			l0_name,
			l1_name,
			l2_name,
			l3_name,
			l4_name,
			l5_name,
			article,
			size,
			---------------
      		channel,
      		reservation_till_date,
      		instock_inclusion,
      		updated_by,
      		updated_at,
      		inventory_source,
      		"comment",
--      		purpose,
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
      		---------------Newly added
			l0_name,
			l1_name,
			l2_name,
			l3_name,
			l4_name,
			l5_name,
			article,
			size,
			---------------
      		channel,
      		reservation_till_date,
      		instock_inclusion,
      		updated_by,
      		updated_at,
      		inventory_source,
      		"comment",
--      		purpose,
			incoming_po_30,
			incoming_po_31_60,
			incoming_po_61_90,
			current_date as deleted_date 
		from inventory_smart.dc_reserve_quantity drq 
		where "type" ='U' and reservation_till_date < current_date;
	
		delete from inventory_smart.dc_reserve_quantity_archive 
		where deleted_date < current_date - 15;
	
		update inventory_smart.dc_reserve_quantity 
		set quantity =0,reservation_till_date = null,"comment" = 'Reservation till date is passed'
--		,purpose = null
		where "type" ='U' and reservation_till_date < current_date;
   
		insert into inventory_smart.dc_reserve_quantity(
		product_code, 
		quantity, 
		"type", 
		inventory_source , 
		dc_code ,
		---------------Newly added
		l0_name,
		l1_name,
		l2_name,
		l3_name,
		l4_name,
		l5_name,
		article,
		size,
		---------------
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
		---------------Newly added
		l0_name,
		l1_name,
		l2_name,
		l3_name,
		l4_name,
		l5_name,
		article,
		size,
		---------------
		channel ,
		incoming_po_30,
		incoming_po_31_60,
		incoming_po_61_90
		from (
			select 
			a.product_code, 
			final_reserve as quantity, 
			'U' as "type", 
			'DC' as inventory_source , 
			dc.dc_code, 
			---------------
			pd.l0_name,
			pd.l1_name,
			pd.l2_name,
			pd.l3_name,
			pd.l4_name,
			pd.l5_name,
			pd.article,
			pd.size,
			---------------
			a.channel,
			a.incoming_po_30,
			a.incoming_po_31_60,
			a.incoming_po_61_90
			from public.dc_reserve_qty a
			join  global.distribution_centres dc
			on a.dc_code = dc.linked_store_code 
			join "global".product_attributes_filter pd
			on a.product_code = pd.product_code
		) x
		on conflict(product_code, dc_code,"type", inventory_source,channel)
		do update 
		set incoming_po_30 = excluded.incoming_po_30,
		incoming_po_31_60 = excluded.incoming_po_31_60,
		incoming_po_61_90 = excluded.incoming_po_61_90,
		l0_name = excluded.l0_name,
		l1_name = excluded.l1_name,
		l2_name = excluded.l2_name,
		l3_name = excluded.l3_name,
		l4_name = excluded.l4_name,
		l5_name = excluded.l5_name,
		article = excluded.article,
		size = excluded.size,
		quantity = excluded.quantity
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