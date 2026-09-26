--liquibase formatted sql
--changeset sriraj.varanasi@impactanalytics.co:sync_po_master runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:sm_sync_po_master
--comment: initial changeset for sync_po_master
--rollback: SELECT 1
DROP PROCEDURE IF EXISTS public.sync_po_master();

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
		  po_code, product_code, channel, requirement_date, 
		  dc_code, not_before_date, allocated_qty, available_qty
		) 
		select po_code, 
		  product_code, 
		  channel, 
		  requirement_date, 
		  dc_code, 
          not_before_date,
		  sum(allocated_qty) as allocated_qty, 
		  sum(available_qty) as available_qty
        from (
		SELECT 
		  po_code, 
		  product_code, 
		  channel, 
		  requirement_date, 
		  dc.dc_code as dc_code,
		  allocated_qty, 
		  available_qty,
		  not_before_date,
		  pack_type_id
		FROM 
		  public.po_latest x 
		  join global.store_master dc on x.dc_code = dc.store_code 
		  join global.product_master pm using(product_code) 
		where 
		  requirement_date >= current_date 
		  and current_date >= not_before_date) x 
group by 1, 2, 3, 4, 5, 6;
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
