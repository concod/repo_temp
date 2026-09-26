-- liquibase formatted sql
-- changeset kumaran.k@impactanalytics.co:sync_bp_simulation_month_v5 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:sync_bp_transaction_data_weekly
-- comment: derived table for sync_bp_simulation_month_v5


DROP  PROCEDURE if exists public.sync_bp_simulation_month();

CREATE OR REPLACE PROCEDURE public.sync_bp_simulation_month()
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
declare
	v_start_date date;
    v_end_date   date;
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'public.sync_bp_simulation_month';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
	    begin
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
	        TRUNCATE TABLE base_pricing.bp_simulation_month CASCADE;

            SELECT 
			MIN(start_date),
			MAX(start_date)
			INTO v_start_date, v_end_date
			FROM public.bp_simulation_month;	

			-- Call your procedure with dynamic parameters
			CALL base_pricing.sp_create_weekly_partitions('bp_simulation_month', v_start_date, v_end_date);	

		
	       INSERT INTO base_pricing.bp_simulation_month
	        (
    product_id,
	channel_id,
	segment_id,
	fiscal_month,
    fiscal_month_name,
    fiscal_year,
	min_cost,
	base_percentage,
	sim_markup_percentage,
	price_point,
	sales_units,
	elasticity_bp,
	promo_elasticity,
    start_date,
    end_date
	        )
select
	product_id,
	channel_id,
	segment_id,
	fiscal_month,
    fiscal_month_name,
    fiscal_year,
	min_cost,
	CASE
    WHEN min_cost <> 0 THEN (price_point - min_cost) / min_cost
    ELSE 0 END AS base_percentage,
	sim_markup_percentage,
	price_point,
	sales_units,
	elasticity_bp,
	coalesce(promo_elasticity,0),
    start_date,
    end_date
			from public.bp_simulation_month;
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