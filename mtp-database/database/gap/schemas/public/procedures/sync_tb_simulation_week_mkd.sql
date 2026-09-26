--liquibase formatted sql
--changeset sreevathsa.sp:sync_tb_simulation_week_mkd_v2 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:sync_tb_simulation_week_mkd
--comment: sync simulation week data from price_markdown_opt.tb_simulation_week_mkd_version into price_markdown_opt.tb_simulation_week_mkd
--rollback: SELECT 1

DROP PROCEDURE IF EXISTS public.sync_tb_simulation_week_mkd();

CREATE OR REPLACE PROCEDURE public.sync_tb_simulation_week_mkd()
 LANGUAGE plpgsql
AS $procedure$

DECLARE
    _log_code varchar := gen_random_uuid();
    _sp_name  varchar := 'public.sync_tb_simulation_week_mkd';
    _log_step varchar;
    _st       timestamp := clock_timestamp();
    _worker   text;
BEGIN
    CALL global.data_ingestion_logs(_log_code, _sp_name, 'start', NULL, (clock_timestamp() - _st)::text, NULL);
    PERFORM set_config('local.log_code', _log_code, true);
    PERFORM set_config('local.sp_name', _sp_name, true);

    BEGIN
        _log_step := 'truncate_tb_simulation_week_mkd';
        TRUNCATE TABLE price_markdown_opt.tb_simulation_week_mkd;

        -- Step 1: create partitions for 70 weeks backward
        _log_step := 'create_partitions_simulation_week_mkd';
        RAISE NOTICE 'sim_week_mkd_step_01_start:%', (clock_timestamp() - _st);
        SELECT async_query INTO _worker FROM public.async_query('call public.pc_create_date_partitions(''price_markdown_opt'', ''tb_simulation_week_mkd'', ''day'', ''30 week'', ''forward'');');
        PERFORM public.async_query_status(_worker, 'cleanup');
        
        SELECT async_query INTO _worker FROM public.async_query('call public.pc_create_date_partitions(''price_markdown_opt'', ''tb_simulation_week_mkd'', ''day'', ''10 week'', ''backward'');');
        PERFORM public.async_query_status(_worker, 'cleanup');
        RAISE NOTICE 'sim_week_mkd_step_01_end:%', (clock_timestamp() - _st);

        -- Step 2: parallel insert from price_markdown_opt.tb_simulation_week_mkd_version into price_markdown_opt.tb_simulation_week_mkd
        _log_step := 'parallel_insert_simulation_week_mkd';
        RAISE NOTICE 'sim_week_mkd_step_02_start:%', (clock_timestamp() - _st);
        INSERT INTO price_markdown_opt.tb_simulation_week_mkd (
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
                FROM price_markdown_opt.tb_simulation_week_mkd_version t1
                WHERE t1.version_code = global.get_table_version('price_markdown_opt.tb_simulation_week_mkd_version'::text);
        RAISE NOTICE 'sim_week_mkd_step_02_end:%', (clock_timestamp() - _st);

        CALL global.data_ingestion_logs(_log_code, _sp_name, 'end', NULL, (clock_timestamp() - _st)::text, NULL);
    EXCEPTION
        WHEN OTHERS THEN
            CALL global.data_ingestion_logs(_log_code, _sp_name, _log_step, SQLERRM, (clock_timestamp() - _st)::text, NULL);
            RAISE EXCEPTION 'Error occurred in the procedure %: %', _sp_name, SQLERRM;
    END;
END
$procedure$
;
