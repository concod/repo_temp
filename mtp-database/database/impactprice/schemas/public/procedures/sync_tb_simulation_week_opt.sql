--liquibase formatted sql
--changeset sreevathsa.sp:sync_tb_simulation_week_opt_v2 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:sync_tb_simulation_week_opt
--comment: sync simulation week data from price_promo_opt.tb_simulation_week_opt_version into price_promo_opt.tb_simulation_week_opt
--rollback: SELECT 1

DROP PROCEDURE IF EXISTS public.sync_tb_simulation_week_opt();

CREATE OR REPLACE PROCEDURE public.sync_tb_simulation_week_opt()
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$

DECLARE
    _log_code varchar := gen_random_uuid();
    _sp_name  varchar := 'public.sync_tb_simulation_week_opt';
    _log_step varchar;
    _st       timestamp := clock_timestamp();
    _worker   text;
BEGIN
    CALL global.data_ingestion_logs(_log_code, _sp_name, 'start', NULL, (clock_timestamp() - _st)::text, NULL);
    PERFORM set_config('local.log_code', _log_code, true);
    PERFORM set_config('local.sp_name', _sp_name, true);

    BEGIN
        _log_step := 'truncate_tb_simulation_week_opt';
       -- TRUNCATE TABLE price_promo_opt.tb_simulation_week_opt;

         SELECT async_query INTO _worker FROM public.async_query('TRUNCATE TABLE price_promo_opt.tb_simulation_week_opt;');
        PERFORM public.async_query_status(_worker, 'cleanup');

        -- Step 1: create partitions for 70 weeks backward
        _log_step := 'create_partitions_simulation_week_opt';
        RAISE NOTICE 'sim_week_opt_step_01_start:%', (clock_timestamp() - _st);
        SELECT async_query INTO _worker FROM public.async_query('call public.pc_create_date_partitions(''price_promo_opt'', ''tb_simulation_week_opt'', ''day'', ''30 week'', ''forward'');');
        PERFORM public.async_query_status(_worker, 'cleanup');
        
        SELECT async_query INTO _worker FROM public.async_query('call public.pc_create_date_partitions(''price_promo_opt'', ''tb_simulation_week_opt'', ''day'', ''10 week'', ''backward'');');
        PERFORM public.async_query_status(_worker, 'cleanup');
        RAISE NOTICE 'sim_week_opt_step_01_end:%', (clock_timestamp() - _st);

        -- Step 2: parallel insert from opt version table into price_promo_opt.tb_simulation_week_opt
        _log_step := 'parallel_insert_simulation_week_opt';
        RAISE NOTICE 'sim_week_opt_step_02_start:%', (clock_timestamp() - _st);
        PERFORM public.parellel_insert(
            'WITH rows AS (
                INSERT INTO price_promo_opt.tb_simulation_week_opt (
                    product_id,
                    simulation_week_start_date,
                    base_percentage,
                    sales_units,
                    baseline_sales_units,
                    elasticity,
                    s0_id,
                    s1_id
                )
                SELECT
                    t1.product_id,
                    t1.simulation_week_start_date,
                    t1.base_percentage,
                    t1.sales_units,
                    t1.baseline_sales_units,
                    t1.elasticity,
                    t1.s0_id,
                    t1.s1_id
                FROM price_promo_opt.tb_simulation_week_opt_version t1
                {where}
                AND t1.version_code = global.get_table_version(''price_promo_opt.tb_simulation_week_opt_version''::text)
                RETURNING 1
            )
            SELECT count(1) AS cnt FROM rows;',
             25,
            'price_promo_opt.tb_simulation_week_opt_version',
            'product_id',
            'sim_week_opt_promo_product_id_idx',
            200
        );
        RAISE NOTICE 'sim_week_opt_step_02_end:%', (clock_timestamp() - _st);

        CALL global.data_ingestion_logs(_log_code, _sp_name, 'end', NULL, (clock_timestamp() - _st)::text, NULL);
    EXCEPTION
        WHEN OTHERS THEN
            CALL global.data_ingestion_logs(_log_code, _sp_name, _log_step, SQLERRM, (clock_timestamp() - _st)::text, NULL);
            RAISE EXCEPTION 'Error occurred in the procedure %: %', _sp_name, SQLERRM;
    END;
END
$procedure$
;
