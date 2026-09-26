-- liquibase formatted sql
-- changeset vaibhav.singh@impactanalytics.co:sync_bp_simulation_week_1301_vs runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:sync_tb_day_split_opt_kvi
-- comment: derived table for sync_bp_simulation_week_1301_vs

DROP PROCEDURE if exists public.sync_bp_simulation_week();

CREATE OR REPLACE PROCEDURE public.sync_bp_simulation_week()
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
DECLARE
    v_start_date date;
    v_end_date   date;
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'public.sync_bp_simulation_week';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
	    begin
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
	        TRUNCATE TABLE base_pricing.bp_simulation_week CASCADE;

			SELECT 
			MIN(week_start_date),
			MAX(week_start_date)
			INTO v_start_date, v_end_date
			FROM public.bp_simulation_week;

			-- Call your procedure with dynamic parameters
			CALL base_pricing.sp_create_weekly_partitions('bp_simulation_week', v_start_date, v_end_date);

	        INSERT INTO base_pricing.bp_simulation_week
	        (
    product_id,
	channel_id,
	segment_id,
	week_start_date,
	min_cost,
	base_percentage,
	sim_markup_percentage,
	price_point,
	sales_units,
	elasticity_bp,
	promo_elasticity
	        )
select
	product_id,
	channel_id,
	segment_id,
	week_start_date,
	min_cost,
	CASE
    WHEN min_cost <> 0 THEN (price_point - min_cost) / min_cost
    ELSE 0 END AS base_percentage,
	sim_markup_percentage,
	price_point,
	sales_units,
	elasticity_bp,
	coalesce(promo_elasticity,0)
			from public.bp_simulation_week;
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