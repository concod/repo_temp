-- liquibase formatted sql
-- changeset sriraj.varanasi@impactanalytics.co:sync_tb_pullforward_coefficient_opt runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:sync_tb_pullforward_coefficient_opt
-- comment: initial changeset for sync_tb_pullforward_coefficient_opt
--rollback: SELECT 1

DROP PROCEDURE IF EXISTS public.sync_tb_pullforward_coefficient_opt();

CREATE OR REPLACE PROCEDURE public.sync_tb_pullforward_coefficient_opt()
LANGUAGE plpgsql
AS $$
declare
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'public.sync_tb_pullforward_coefficient_opt';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
BEGIN
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin

    TRUNCATE TABLE price_promo_opt.tb_pullforward_coefficient_opt;

    INSERT INTO price_promo_opt.tb_pullforward_coefficient_opt (
        product_id,
        lag_week_number,
        multiplier
    )
    SELECT DISTINCT
        v.product_id,
        v.lag_week_number,
        v.multiplier
    FROM price_promo_opt.tb_pullforward_coefficient_opt_version v
    WHERE v.version_code = global.get_table_version('price_promo_opt.tb_pullforward_coefficient_opt_version');
		call global.data_ingestion_logs(_log_code, _sp_name, 'end', null, (clock_timestamp() - _st)::text, null);
	exception
		when others then
	        -- Log the error if an exception occurs during any part of the procedure
	        call global.data_ingestion_logs(_log_code, _sp_name, _log_step, SQLERRM, (clock_timestamp() - _st)::text, null);
            raise exception 'Error occurred in the procedure: %', SQLERRM;
	end;
END;
$$;
