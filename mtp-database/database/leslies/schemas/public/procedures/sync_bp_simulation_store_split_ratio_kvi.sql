-- liquibase formatted sql
-- changeset vaibhav.singh@impactanalytics.co:sync_bp_simulation_store_split_ratio_kvi_1301_vs runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:sync_tb_day_split_opt_kvi
-- comment: derived table for sync_bp_simulation_store_split_ratio_kvi_1301_vs

DROP PROCEDURE if exists public.sync_bp_simulation_store_split_ratio_kvi();

CREATE OR REPLACE PROCEDURE public.sync_bp_simulation_store_split_ratio_kvi()
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
DECLARE
    v_start_date date;
    v_end_date   date;
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'public.sync_bp_simulation_store_split_ratio_kvi';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
	    begin
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
	        TRUNCATE TABLE base_pricing.bp_simulation_store_split_ratio_kvi CASCADE;

          SELECT 
          MIN(week_start_date),
          MAX(week_start_date)
          INTO v_start_date, v_end_date
          FROM public.bp_simulation_store_split_ratio_kvi;

          -- Call your procedure with dynamic parameters
          CALL base_pricing.sp_create_weekly_partitions('bp_simulation_store_split_ratio_kvi', v_start_date, v_end_date);

	        INSERT INTO base_pricing.bp_simulation_store_split_ratio_kvi
	        (
     product_id
     ,store_id
     ,channel_id
     ,segment_id
     ,week_start_date
     ,store_split_ratio
	        )
			select
                product_id
     ,cast(store_id as int4) as store_id
     ,channel_id
     ,segment_id
     ,week_start_date
     ,store_split_ratio
			from public.bp_simulation_store_split_ratio_kvi;
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
