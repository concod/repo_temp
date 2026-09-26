--liquibase formatted sql
--changeset aman_lakkoju:including_56_days_data runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: including_56_days_data
--rollback: SELECT 1

DROP PROCEDURE if exists public.sync_po_master();
CREATE OR REPLACE PROCEDURE public.sync_po_master()
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
declare
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'public.sync_po_master';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
begin
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
		delete from 
		  inventory_smart.po_master 
		where 
		  true;
		insert into inventory_smart.po_master (
		  po_code, product_code,article, channel, requirement_date, 
		  dc_code, allocated_qty, available_qty,oo_pack_qty,oh_pack_qty,not_before_date,pack_type_id
		) 

select po_code, 
		  product_code,
		  article,
		  channel, 
		  delivery_date, 
		  dc_code, 
		  sum(allocated_qty) as allocated_qty, 
		  sum(available_qty) as available_qty,
		  sum(allocated_qty) as oo_pack_qty,
		  sum(oh_pack_qty) as oh_pack_qty,
		  not_before_date,pack_type_id from (
		SELECT 
		  po_code, 
		  x.product_code, 
		  paf.article,
		  saf.channel, 
		  delivery_date, 
		  saf.store_code::int as dc_code, 
		  x.allocated_qty, 
		  x.available_qty,
		  0 as oh_pack_qty,
		  x.not_before_date,
		  x.pack_type_id
		FROM 
		  public.po_latest x 
		  join global.store_attributes_filter saf on x.dc_code = saf.store_code 
		  join global.product_master pm on x.product_code=pm.product_code
			join global.product_attributes_filter paf on x.product_code=paf.product_code
		  where 
		  delivery_date >= current_date-56
		  and current_date >= not_before_date) x group by po_code, product_code,article, dc_code, channel, delivery_date, not_before_date,pack_type_id;
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