-- liquibase formatted sql
-- changeset sriraj.varanasi@impactanalytics.co:sync_populate_tb_simulation_day_opt_v2 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:sync_populate_tb_simulation_day_opt_v2
-- comment: initial changeset for sync_populate_tb_simulation_day_opt_v2
--rollback: SELECT 1

DROP PROCEDURE IF EXISTS public.sync_populate_tb_simulation_day_opt_v2();

CREATE OR REPLACE PROCEDURE public.sync_populate_tb_simulation_day_opt_v2()
LANGUAGE plpgsql
AS $$
declare
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'public.sync_populate_tb_simulation_day_opt_v2';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
BEGIN
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin

CALL price_promo_opt.pc_create_date_partitions('price_promo_opt', 'tb_simulation_day_opt', 'day', '3 week', 'backward');
CALL price_promo_opt.pc_create_date_partitions('price_promo_opt', 'tb_simulation_day_opt', 'day', '29 week', 'forward');


DELETE FROM price_promo_opt.tb_simulation_day_opt;


    INSERT INTO price_promo_opt.tb_simulation_day_opt
        (product_id, week_start_date, date_id, base_percentage)
    SELECT
        pm.product_id,
        a.simulation_week_start_date AS week_start_date,
        a.date_id,
        b.base_percentage
    FROM price_promo.product_master pm
    CROSS JOIN (
        SELECT DISTINCT date_id, simulation_week_start_date
        FROM global.tb_fiscal_date_mapping
        WHERE date_id BETWEEN current_date - 15 AND current_date + 185
    ) AS a
    CROSS JOIN (
        SELECT generate_series(0,95,5) AS base_percentage
    ) AS b
    WHERE pm.is_active = 1
GROUP BY pm.product_id, a.simulation_week_start_date, a.date_id, b.base_percentage;


    UPDATE price_promo_opt.tb_simulation_day_opt
    SET sales_units = (random() * 100 + 1),          -- 1 to 101
        baseline_sales_units = (random() * 10 + 1),  -- 1 to 11
        elasticity = (random() * 2),                 -- 0 to 2
        day_split_ratio = (random()),                -- 0 to 1
        end_cap_coeff = (random() * 0.5 + 0.75),     -- 0.75 to 1.25
        reg_price_multiplier = (random() * 0.5 + 0.5) -- 0.5 to 1.0
    WHERE day_split_ratio IS NULL
       OR end_cap_coeff IS NULL
       OR reg_price_multiplier IS NULL;

		call global.data_ingestion_logs(_log_code, _sp_name, 'end', null, (clock_timestamp() - _st)::text, null);
	exception
		when others then
	        -- Log the error if an exception occurs during any part of the procedure
	        call global.data_ingestion_logs(_log_code, _sp_name, _log_step, SQLERRM, (clock_timestamp() - _st)::text, null);
            raise exception 'Error occurred in the procedure: %', SQLERRM;
	end;
END;
$$;