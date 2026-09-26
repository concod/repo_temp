-- liquibase formatted sql
-- changeset sriraj.varanasi@impactanalytics.co:sync_tb_simulation_day_opt_v1 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:sync_tb_simulation_day_opt
-- comment: initial changeset for sync_tb_simulation_day_opt_v1
--rollback: SELECT 1

DROP PROCEDURE IF EXISTS public.sync_tb_simulation_day_opt();

CREATE OR REPLACE PROCEDURE public.sync_tb_simulation_day_opt()
 LANGUAGE plpgsql
AS $procedure$
declare
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'public.sync_tb_simulation_day_opt';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
BEGIN
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
        TRUNCATE TABLE price_promo_opt.tb_simulation_day_opt;

        call public.pc_create_date_partitions('price_promo_opt', 'tb_simulation_day_opt', 'day', '30 week', 'forward');
        call public.pc_create_date_partitions('price_promo_opt', 'tb_simulation_day_opt', 'day', '6 week', 'backward');
     
        INSERT INTO price_promo_opt.tb_simulation_day_opt (
            product_id,
            simulation_week_start_date,
            date,
            base_percentage,
            sales_units,
            baseline_sales_units,
            elasticity,
            store_split_level,
            day_split_ratio,
            end_cap_hierarchy_level,
            end_cap_multiplier,
            reg_price_multiplier
        )
        SELECT
            v.product_id,
            v.simulation_week_start_date,
            v.date,
            v.base_percentage,
            v.sales_units,
            v.baseline_sales_units,
            v.elasticity,
            v.store_split_level,
            v.day_split_ratio,
            v.end_cap_hierarchy_level,
            v.end_cap_multiplier,
            v.reg_price_multiplier
        FROM price_promo_opt.tb_simulation_day_opt_version v
        WHERE v.version_code = global.get_table_version('price_promo_opt.tb_simulation_day_opt_version');
    
		call global.data_ingestion_logs(_log_code, _sp_name, 'end', null, (clock_timestamp() - _st)::text, null);
	exception
		when others then
	        -- Log the error if an exception occurs during any part of the procedure
	        call global.data_ingestion_logs(_log_code, _sp_name, 'error', SQLERRM, (clock_timestamp() - _st)::text, null);
            raise exception 'Error occurred in the procedure: %', SQLERRM;
	end;
END;
$procedure$
;
