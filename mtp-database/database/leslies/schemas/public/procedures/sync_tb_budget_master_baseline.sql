-- liquibase formatted sql
-- changeset kumaran.k@impactanalytics.co:sync_tb_budget_master_baseline_v1 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:sync_transaction_opt_basket_promo
-- comment: derived table for sync_tb_budget_master_baseline_v1

DROP  PROCEDURE if exists public.sync_tb_budget_master_baseline();

CREATE OR REPLACE PROCEDURE public.sync_tb_budget_master_baseline()
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
declare
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'public.sync_tb_budget_master_baseline';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
begin
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
	        TRUNCATE TABLE price_promo_opt.tb_budget_master_baseline;
			call public.pc_create_date_partitions('price_promo_opt', 'tb_budget_master_baseline', 'day', '15 week', 'backward');
			call public.pc_create_date_partitions('price_promo_opt', 'tb_budget_master_baseline', 'day', '40 week', 'forward');
	        INSERT INTO price_promo_opt.tb_budget_master_baseline
	        (
            dates,
            week_start_date,
            c0_id,
            s0_id,
            s0_name,
            s3_id,
            s3_name,
            product_id,
            sales_units,
            margin,
            revenue
	        )
			select
            date,
            week_start_date,
            c0_id,
            s0_id,
            s0_name,
            s3_id,
            s3_name,
            cast(product_id as int4),
            sales_units,
            margin,
            revenue
			from public.tb_budget_master_baseline;
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
