--liquibase formatted sql
--changeset sreevathsa.sp:sync_tb_store_split_opt_v2 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:sync_tb_store_split_opt
--comment: sync store split data from price_promo_opt.tb_store_split_opt_version into price_promo_opt.tb_store_split_opt
--rollback: SELECT 1

DROP PROCEDURE IF EXISTS public.sync_tb_store_split_opt();

CREATE OR REPLACE PROCEDURE public.sync_tb_store_split_opt()
 LANGUAGE plpgsql
AS $procedure$

DECLARE
    _log_code varchar := gen_random_uuid();
    _sp_name  varchar := 'public.sync_tb_store_split_opt';
    _log_step varchar;
    _st       timestamp := clock_timestamp();
    _worker   text;
BEGIN
    CALL global.data_ingestion_logs(_log_code, _sp_name, 'start', NULL, (clock_timestamp() - _st)::text, NULL);
    PERFORM set_config('local.log_code', _log_code, true);
    PERFORM set_config('local.sp_name', _sp_name, true);

    BEGIN
        -- Step 1: create partitions for 70 weeks backward
        _log_step := 'create_partitions_store_split_opt';
        RAISE NOTICE 'store_split_opt_step_01_start:%', (clock_timestamp() - _st);
        SELECT async_query INTO _worker FROM public.async_query('call public.pc_create_date_partitions(''price_promo_opt'', ''tb_store_split_opt'', ''day'', ''10 week'', ''backward'');');
        PERFORM public.async_query_status(_worker, 'cleanup');
       SELECT async_query INTO _worker FROM public.async_query('call public.pc_create_date_partitions(''price_promo_opt'', ''tb_store_split_opt'', ''day'', ''30 week'', ''forward'');');
        PERFORM public.async_query_status(_worker, 'cleanup');
        RAISE NOTICE 'store_split_opt_step_01_end:%', (clock_timestamp() - _st);

        -- Step 2: cleanup store split data before re-insert
        _log_step := 'truncate_tb_store_split_opt';
        TRUNCATE TABLE price_promo_opt.tb_store_split_opt;
        RAISE NOTICE 'store_split_opt_step_02_end:%', (clock_timestamp() - _st);

        -- Step 3: parallel insert from version table into price_promo_opt.tb_store_split_opt
        _log_step := 'insert_store_split_opt';
        RAISE NOTICE 'store_split_opt_step_03_start:%', (clock_timestamp() - _st);
        INSERT INTO price_promo_opt.tb_store_split_opt (
		    store_id,
		    l3_cid,
		    l0_cid,
		    simulation_week_start_date,
		    store_split_ratio,
		    s1_id,
		    store_reco_level,
		    s0_id
		)
		SELECT
		    t1.store_id,
		    t1.l3_cid,
		    t1.l0_cid,
		    t1.simulation_week_start_date,
		    t1.store_split_ratio,
		    t1.s1_id,
		    t1.store_reco_level,
		    t1.s0_id
		FROM price_promo_opt.tb_store_split_opt_version t1
		WHERE t1.version_code = global.get_table_version('price_promo_opt.tb_store_split_opt_version'::text);

        RAISE NOTICE 'store_split_opt_step_03_end:%', (clock_timestamp() - _st);

        CALL global.data_ingestion_logs(_log_code, _sp_name, 'end', NULL, (clock_timestamp() - _st)::text, NULL);

    EXCEPTION
        WHEN OTHERS THEN
            CALL global.data_ingestion_logs(_log_code, _sp_name, _log_step, SQLERRM, (clock_timestamp() - _st)::text, NULL);
            RAISE EXCEPTION 'Error occurred in the procedure %: %', _sp_name, SQLERRM;
    END;
END
$procedure$
;
