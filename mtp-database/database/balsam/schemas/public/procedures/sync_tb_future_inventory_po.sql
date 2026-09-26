-- liquibase formatted sql
-- changeset abhishek.verma@impactanalytics.co:sync_tb_future_inventory_po runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:sync_tb_future_inventory_po
-- comment: derived table for tb_future_inventory_po

DROP PROCEDURE IF EXISTS public.sync_tb_future_inventory_po;
create or replace procedure public.sync_tb_future_inventory_po()
language plpgsql
security definer
as $procedure$
declare
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'public.sync_tb_future_inventory_po';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
begin
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
	TRUNCATE TABLE global.tb_future_inventory_po;
	insert into global.tb_future_inventory_po
	(product_id, po_date, initial_eta, ordered_quantity
)
	select 
	product_id, po_date, initial_eta, ordered_quantity
	from public.future_inventory_po;
	
		call global.data_ingestion_logs(_log_code, _sp_name, 'end', null, (clock_timestamp() - _st)::text, null);
	exception
		when others then
	        -- Log the error if an exception occurs during any part of the procedure
	        call global.data_ingestion_logs(_log_code, _sp_name, _log_step, SQLERRM, (clock_timestamp() - _st)::text, null);
            raise exception 'Error occurred in the procedure: %', SQLERRM;
	end;
end;
$procedure$;