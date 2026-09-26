-- liquibase formatted sql
-- changeset kumaran.k@impactanalytics.co:sync_bp_simulation_store_split_ratio_kvi_month_v5 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:sync_bp_transaction_data_weekly
-- comment: derived table for sync_bp_simulation_store_split_ratio_kvi_month_v5


DROP  PROCEDURE if exists public.sync_bp_simulation_store_split_ratio_kvi_month();

CREATE OR REPLACE PROCEDURE public.sync_bp_simulation_store_split_ratio_kvi_month()
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
declare
	v_start_date date;
    v_end_date   date;
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'public.sync_bp_simulation_store_split_ratio_kvi_month';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
	    begin
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
	        TRUNCATE TABLE base_pricing.bp_simulation_store_split_ratio_kvi_month CASCADE;

            SELECT 
			MIN(start_date),
			MAX(start_date)
			INTO v_start_date, v_end_date
			FROM public.bp_simulation_store_split_ratio_kvi_month;	

			-- Call your procedure with dynamic parameters
			CALL base_pricing.sp_create_weekly_partitions('bp_simulation_store_split_ratio_kvi_month', v_start_date, v_end_date);

	        INSERT INTO base_pricing.bp_simulation_store_split_ratio_kvi_month
	        (
     product_id
     ,store_id
     ,channel_id
     ,segment_id
     ,fiscal_month
     ,fiscal_month_name
     ,fiscal_year
     ,store_split_ratio
     ,start_date
     ,end_date
	        )
			select
                product_id
     ,cast(store_id as int4) as store_id
     ,channel_id
     ,segment_id
     ,fiscal_month
     ,fiscal_month_name
     ,fiscal_year
     ,store_split_ratio
     ,start_date
     ,end_date
			from public.bp_simulation_store_split_ratio_kvi_month;
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

