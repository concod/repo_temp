--liquibase formatted sql
--changeset sreevathsa.sp:sync_tb_day_split_opt_v1 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:sync_tb_day_split_opt
--comment: sync day split data from price_promo_opt.tb_day_split_opt_version into price_promo_opt.tb_day_split_opt
--rollback: SELECT 1

DROP PROCEDURE IF EXISTS public.sync_tb_day_split_opt();

CREATE OR REPLACE PROCEDURE public.sync_tb_day_split_opt()
 LANGUAGE plpgsql
AS $procedure$

DECLARE
    _log_code varchar := gen_random_uuid();
    _sp_name  varchar := 'public.sync_tb_day_split_opt';
    _log_step varchar;
    _st       timestamp := clock_timestamp();
BEGIN
    CALL global.data_ingestion_logs(_log_code, _sp_name, 'start', NULL, (clock_timestamp() - _st)::text, NULL);
    PERFORM set_config('local.log_code', _log_code, true);
    PERFORM set_config('local.sp_name', _sp_name, true);

    BEGIN
        _log_step := 'truncate_tb_day_split_opt';
        TRUNCATE TABLE price_promo_opt.tb_day_split_opt;

        _log_step := 'create_partitions_forward';
        CALL public.pc_create_date_partitions('price_promo_opt', 'tb_day_split_opt', 'day', '30 week', 'forward');

        _log_step := 'create_partitions_backward';
        CALL public.pc_create_date_partitions('price_promo_opt', 'tb_day_split_opt', 'day', '10 week', 'backward');
        
        _log_step := 'insert_tb_day_split_opt';
        INSERT INTO price_promo_opt.tb_day_split_opt (
            l3_cid,
            date,
            simulation_week_start_date,
            day_split_ratio,
            l0_cid,
            s0_id,
            s1_id
        )
        SELECT
            v.l3_cid,
            v.date,
            v.simulation_week_start_date,
            v.day_split_ratio,
            v.l0_cid,
            v.s0_id,
            v.s1_id
        FROM price_promo_opt.tb_day_split_opt_version v
        WHERE v.version_code = global.get_table_version('price_promo_opt.tb_day_split_opt_version');
    
        CALL global.data_ingestion_logs(_log_code, _sp_name, 'end', NULL, (clock_timestamp() - _st)::text, NULL);
    EXCEPTION
        WHEN OTHERS THEN
            CALL global.data_ingestion_logs(_log_code, _sp_name, _log_step, SQLERRM, (clock_timestamp() - _st)::text, NULL);
            RAISE EXCEPTION 'Error occurred in the procedure %: %', _sp_name, SQLERRM;
    END;
END
$procedure$;
