--liquibase formatted sql
--changeset sreevathsa.sp:sync_budget_master_baseline_v1 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:sync_budget_master_baseline
--comment: sync baseline budget from public.tb_budget_master_combined into price_promo_opt.tb_budget_master_baseline
--rollback: SELECT 1

DROP PROCEDURE IF EXISTS public.sync_budget_master_baseline();

CREATE OR REPLACE PROCEDURE public.sync_budget_master_baseline()
 LANGUAGE plpgsql
AS $procedure$

DECLARE
    _log_code varchar := gen_random_uuid();
    _sp_name  varchar := 'public.sync_budget_master_baseline';
    _log_step varchar;
    _st       timestamp := clock_timestamp();
    _worker   text;
BEGIN
    CALL global.data_ingestion_logs(_log_code, _sp_name, 'start', NULL, (clock_timestamp() - _st)::text, NULL);
    PERFORM set_config('local.log_code', _log_code, true);
    PERFORM set_config('local.sp_name', _sp_name, true);

    BEGIN
        -- Step 1: create date partitions for 70 weeks backward
        _log_step := 'create_partitions_baseline';
        RAISE NOTICE 'bsl_step_01_start:%', (clock_timestamp() - _st);
        SELECT async_query INTO _worker FROM public.async_query('call public.pc_create_date_partitions(''price_promo_opt'', ''tb_budget_master_baseline'', ''day'', ''70 week'', ''backward'');');
        PERFORM public.async_query_status(_worker, 'cleanup');
        RAISE NOTICE 'bsl_step_01_end:%', (clock_timestamp() - _st);

        -- Step 2: parallel upsert into tb_budget_master_baseline
        _log_step := 'parallel_upsert_baseline';
        RAISE NOTICE 'bsl_step_02_start:%', (clock_timestamp() - _st);
        PERFORM public.parellel_insert(
            'WITH rows AS (
                INSERT INTO price_promo_opt.tb_budget_master_baseline (
                    product_id,
                    dates,
                    units,
                    margin,
                    revenue,
                    store_id,
                    promo_spend,
                    currency_id,
                    store_reco_level
                )
                SELECT
                    t1.product_id::int4,
                    t1.dates::date,
                    t1.baseline_units::int4,
                    t1.baseline_margin::float4,
                    t1.baseline_revenue::float4,
                    t1.store_id::int4,
                    t1.baseline_promo_spend::float4,
                    t1.currency_id::int4,
                    t1.store_reco_level::text
                FROM public.tb_budget_master_combined t1
                {where}
                ON CONFLICT (product_id, store_id, dates)
                DO UPDATE SET
                    units          = EXCLUDED.units,
                    margin         = EXCLUDED.margin,
                    revenue        = EXCLUDED.revenue,
                    promo_spend    = EXCLUDED.promo_spend,
                    currency_id    = EXCLUDED.currency_id,
                    store_reco_level = EXCLUDED.store_reco_level
                RETURNING 1
            )
            SELECT count(1) AS cnt FROM rows;',
            50,
            'public.tb_budget_master_combined',
            'product_id',
            'tb_budget_master_combined_prod_id_idx',
            30
        );
        RAISE NOTICE 'bsl_step_02_end:%', (clock_timestamp() - _st);

        CALL global.data_ingestion_logs(_log_code, _sp_name, 'end', NULL, (clock_timestamp() - _st)::text, NULL);

    EXCEPTION
        WHEN OTHERS THEN
            CALL global.data_ingestion_logs(_log_code, _sp_name, _log_step, SQLERRM, (clock_timestamp() - _st)::text, NULL);
            RAISE EXCEPTION 'Error occurred in the procedure %: %', _sp_name, SQLERRM;
    END;
END
$procedure$;
