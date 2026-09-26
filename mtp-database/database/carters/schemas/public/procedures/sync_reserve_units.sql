--liquibase formatted sql
--changeset shrinidhi.choragi@impactanalytics.co:sync_reserve_units_update runOnChange:true stripComments:false splitStatements:false context:updated_logic labels:updated_logic
--comment: updated logic for dc pack reserved units 

DROP PROCEDURE if exists public.sync_reserve_units();

CREATE OR REPLACE PROCEDURE public.sync_reserve_units()
LANGUAGE plpgsql
SECURITY DEFINER
AS $procedure$
declare
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'public.sync_reserve_units';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
BEGIN
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
		delete from inventory_smart.dc_pack_reserve_quantity 
		where article not in (
		select distinct article from "global".product_attributes_filter paf
		where is_deleted = false and active = true 
		);
	
		delete from inventory_smart.dc_pack_reserve_quantity
		where updated_by is null and updated_at is null and 
		concat(article, pack_type_id, dc_name) not in (
			select concat(article, pack_id, dc_code) from 
				public.reserved_units x
		);
	
		update inventory_smart.dc_pack_reserve_quantity 
		set quantity =0, reservation_till_date = null,is_reserved = false
      -- , 
		-- "comment" = 'Reserve Expired - ' || COALESCE("comment", '') 
		where reservation_till_date < current_date;
	
        
		insert into inventory_smart.dc_pack_reserve_quantity(
			   pack_type_id,quantity, 
		       is_reserved,
		       percentage,channel, updated_at,reservation_till_date, created_at,
		       instock_inclusion,updated_by ,comment,  article,dc_code, dc_name,type,incoming_po_30,incoming_po_31_60,incoming_po_61_90
				) 
			   select 
			   pack_type_id,quantity, is_reserved,percentage,channel,updated_at,
		       reservation_till_date,created_at,instock_inclusion,updated_by,comment, article,dc_code,  dc_name,type,incoming_po_30,incoming_po_31_60 ,incoming_po_61_90   
		       FROM  
		       (
		       select 
		       pack_id pack_type_id, 
		       cast(null as int4) as quantity, 
		       false as is_reserved,
		       cast(null as int4) as percentage,
		       channel, 
		       cast(null as timestamptz) updated_at,
		       cast(null as timestamptz) reservation_till_date,
		       cast(null as timestamptz) created_at,
		       false as instock_inclusion,
		       cast(null as varchar) updated_by,
		       cast(null as varchar) comment, 
		       article,
		       b.dc_code as dc_code, 
		       a.dc_code as dc_name,
		       cast(null as varchar) type,
		       incoming_po_30,
		       incoming_po_31_60,
		       incoming_po_61_90 
		       from 
			       public.reserved_units a 
			       join "global".distribution_centres b
			       on a.dc_code = b.linked_store_code
			       where a.dc_code is not null
		        ) a
				on conflict(article, pack_type_id, dc_code)
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
END;
$procedure$;