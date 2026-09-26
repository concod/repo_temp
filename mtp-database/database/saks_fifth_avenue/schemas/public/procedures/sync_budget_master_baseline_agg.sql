-- liquibase formatted sql
-- changeset kumaran.k@impactanalytics.co:sync_budget_master_baseline_agg_v2 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:sync_budget_master_baseline_agg
-- comment: derived table for sync_budget_master_baseline_agg_v2

DROP  PROCEDURE if exists public.sync_budget_master_baseline_agg();

CREATE OR REPLACE PROCEDURE public.sync_budget_master_baseline_agg()
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
declare
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'public.sync_budget_master_baseline_agg';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
begin
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
	        TRUNCATE TABLE price_promo_opt.tb_budget_master_baseline_agg;
            call price_promo_opt.pc_create_date_partitions('price_promo_opt', 'tb_budget_master_baseline_agg', 'day', '3 week', 'backward');
            call price_promo_opt.pc_create_date_partitions('price_promo_opt', 'tb_budget_master_baseline_agg', 'day', '29 week', 'forward');

	        INSERT INTO price_promo_opt.tb_budget_master_baseline_agg
	        (
        s1_id,
        channel,
        product_id,
        dates,
        units,
        margin,
        revenue
	        )
			select
        s1_id,
        channel,
        product_id,
        cast(date as date),
        units,
        margin,
        revenue
			from public.budget_master_baseline_agg
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