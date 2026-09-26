--liquibase formatted sql
--changeset sreevathsa.sp:sync_tb_store_split_mkd_v1 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:sync_tb_store_split_mkd
--comment: sync store split mkd data from price_markdown_opt.tb_store_split_mkd_version into price_markdown_opt.tb_store_split_mkd
--rollback: SELECT 1

DROP PROCEDURE IF EXISTS public.sync_tb_store_split_mkd();

CREATE OR REPLACE PROCEDURE public.sync_tb_store_split_mkd()
 LANGUAGE plpgsql
AS $procedure$
DECLARE
    _log_code varchar := gen_random_uuid();
    _sp_name  varchar := 'public.sync_tb_store_split_mkd';
    _log_step varchar;
    _st       timestamp := clock_timestamp();
    _worker   text;
BEGIN
    CALL global.data_ingestion_logs(_log_code, _sp_name, 'start', NULL, (clock_timestamp() - _st)::text, NULL);
    PERFORM set_config('local.log_code', _log_code, true);
    PERFORM set_config('local.sp_name', _sp_name, true);

    BEGIN
        -- Step 1: create partitions for backward and forward window
        _log_step := 'create_partitions_store_split_mkd';
        RAISE NOTICE 'store_split_mkd_step_01_start:%', (clock_timestamp() - _st);
        SELECT async_query INTO _worker FROM public.async_query('call public.pc_create_date_partitions(''price_markdown_opt'', ''tb_store_split_mkd'', ''day'', ''10 week'', ''backward'');');
        PERFORM public.async_query_status(_worker, 'cleanup');
        SELECT async_query INTO _worker FROM public.async_query('call public.pc_create_date_partitions(''price_markdown_opt'', ''tb_store_split_mkd'', ''day'', ''30 week'', ''forward'');');
        PERFORM public.async_query_status(_worker, 'cleanup');
        RAISE NOTICE 'store_split_mkd_step_01_end:%', (clock_timestamp() - _st);

        -- Step 2: cleanup target before re-insert
        _log_step := 'truncate_tb_store_split_mkd';

        SELECT async_query INTO _worker FROM public.async_query('TRUNCATE TABLE price_markdown_opt.tb_store_split_mkd;');
        PERFORM public.async_query_status(_worker, 'cleanup');
        

        RAISE NOTICE 'store_split_mkd_step_02_end:%', (clock_timestamp() - _st);

        -- Step 3: parallel insert from version table into price_markdown_opt.tb_store_split_mkd
        _log_step := 'parallel_insert_store_split_mkd';
        RAISE NOTICE 'store_split_mkd_step_03_start:%', (clock_timestamp() - _st);
        PERFORM public.parellel_insert(
            'WITH rows AS (
                INSERT INTO price_markdown_opt.tb_store_split_mkd (
                    store_id,
                    product_id,
                    simulation_week_start_date,
                    store_split_ratio,
                    s1_id,
                    store_reco_level,
                    s0_id
                )
                SELECT
                    t1.store_id,
                    t1.product_id,
                    t1.simulation_week_start_date,
                    t1.store_split_ratio,
                    t1.s1_id,
                    t1.store_reco_level,
                    t1.s0_id
                FROM price_markdown_opt.tb_store_split_mkd_version t1
                {where}
                AND t1.version_code = global.get_table_version(''price_markdown_opt.tb_store_split_mkd_version''::text)
                RETURNING 1
            )
            SELECT count(1) AS cnt FROM rows;',
            20,
            'price_markdown_opt.tb_store_split_mkd_version',
            'product_id',
            'store_split_mkd_product_id_idx',
            250
        );
        RAISE NOTICE 'store_split_mkd_step_03_end:%', (clock_timestamp() - _st);

        CALL global.data_ingestion_logs(_log_code, _sp_name, 'end', NULL, (clock_timestamp() - _st)::text, NULL);

    EXCEPTION
        WHEN OTHERS THEN
            CALL global.data_ingestion_logs(_log_code, _sp_name, _log_step, SQLERRM, (clock_timestamp() - _st)::text, NULL);
            RAISE EXCEPTION 'Error occurred in the procedure %: %', _sp_name, SQLERRM;
    END;
END
$procedure$
;
