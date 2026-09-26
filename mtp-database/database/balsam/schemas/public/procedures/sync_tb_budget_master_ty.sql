-- liquibase formatted sql
-- changeset abhishek.verma@impactanalytics.co:sync_tb_budget_master_ty runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:sync_tb_budget_master_ty
-- comment: derived table for tb_budget_master_ty

DROP PROCEDURE IF EXISTS public.sync_tb_budget_master_ty;
create or replace procedure public.sync_tb_budget_master_ty()
language plpgsql
security definer
as $procedure$
declare
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'public.sync_tb_budget_master_ty';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
begin
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
	TRUNCATE TABLE price_promo_opt.tb_budget_master_ty;
	call price_promo_opt.pc_create_date_partitions('price_promo_opt', 'tb_budget_master_ty', 'day', '2 year', 'backward');
    call price_promo_opt.pc_create_date_partitions('price_promo_opt', 'tb_budget_master_ty', 'day', '2 year', 'forward');
	
	insert into price_promo_opt.tb_budget_master_ty
	(product_id, dates, units, margin, revenue
)
	select 
	product_id, dates, units, margin, revenue
	from public.tb_budget_master_ty;
	
		call global.data_ingestion_logs(_log_code, _sp_name, 'end', null, (clock_timestamp() - _st)::text, null);
	exception
		when others then
	        -- Log the error if an exception occurs during any part of the procedure
	        call global.data_ingestion_logs(_log_code, _sp_name, _log_step, SQLERRM, (clock_timestamp() - _st)::text, null);
            raise exception 'Error occurred in the procedure: %', SQLERRM;
	end;
end;
$procedure$;