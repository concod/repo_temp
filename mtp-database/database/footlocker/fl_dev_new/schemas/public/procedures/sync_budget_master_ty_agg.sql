--liquibase formatted sql
--changeset sreevathsa.sp:sync_budget_master_ty_agg_v2 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:sync_budget_master_ty_agg
--comment: aggregate tb_budget_master_combined ty data into tb_budget_master_ty_agg
--rollback: SELECT 1

DROP PROCEDURE IF EXISTS public.sync_budget_master_ty_agg();

CREATE OR REPLACE PROCEDURE public.sync_budget_master_ty_agg()
 LANGUAGE plpgsql
AS $procedure$

DECLARE
    _log_code varchar := gen_random_uuid();
    _sp_name  varchar := 'public.sync_budget_master_ty_agg';
    _log_step varchar;
    _st       timestamp := clock_timestamp();
    _worker   text;
BEGIN
    CALL global.data_ingestion_logs(_log_code, _sp_name, 'start', NULL, (clock_timestamp() - _st)::text, NULL);
    PERFORM set_config('local.log_code', _log_code, true);
    PERFORM set_config('local.sp_name', _sp_name, true);

    BEGIN
        -- Step 1: create partitions for 70 weeks backward
        _log_step := 'create_partitions_ty_agg';
        RAISE NOTICE 'ty_agg_step_01_start:%', (clock_timestamp() - _st);
        SELECT async_query INTO _worker FROM public.async_query('call public.pc_create_date_partitions(''price_promo_opt'', ''tb_budget_master_ty_agg'', ''day'', ''70 week'', ''backward'');');
        PERFORM public.async_query_status(_worker, 'cleanup');
        RAISE NOTICE 'ty_agg_step_01_end:%', (clock_timestamp() - _st);

        -- Step 2: parallel aggregate + upsert into tb_budget_master_ty_agg
        _log_step := 'parallel_upsert_ty_agg';
        RAISE NOTICE 'ty_agg_step_02_start:%', (clock_timestamp() - _st);
        PERFORM public.parellel_insert(
            'WITH rows AS (
                INSERT INTO price_promo_opt.tb_budget_master_ty_agg (
                    product_id,
                    dates,
                    store_reco_level,
                    units,
                    margin,
                    revenue,
                    promo_spend
                )
                SELECT
                    t.product_id::int4,
                    t.dates::date,
                    t.store_reco_level::text,
                    SUM(t.ty_units)::bigint        AS units,
                    SUM(t.ty_margin)::numeric(20,2) AS margin,
                    SUM(t.ty_revenue)::numeric(20,2) AS revenue,
                    SUM(t.ty_promo_spend)::float4  AS promo_spend
                FROM public.tb_budget_master_combined t
                {where}
                GROUP BY
                    t.product_id,
                    t.dates,
                    t.store_reco_level
                ON CONFLICT (product_id, store_reco_level, dates)
                DO UPDATE SET
                    units       = EXCLUDED.units,
                    margin      = EXCLUDED.margin,
                    revenue     = EXCLUDED.revenue,
                    promo_spend = EXCLUDED.promo_spend
                RETURNING 1
            )
            SELECT count(1) AS cnt FROM rows;',
            50,
            'public.tb_budget_master_combined',
            'product_id',
            'tb_budget_master_combined_prod_id_idx',
            30
        );
        RAISE NOTICE 'ty_agg_step_02_end:%', (clock_timestamp() - _st);

        CALL global.data_ingestion_logs(_log_code, _sp_name, 'end', NULL, (clock_timestamp() - _st)::text, NULL);

    EXCEPTION
        WHEN OTHERS THEN
            CALL global.data_ingestion_logs(_log_code, _sp_name, _log_step, SQLERRM, (clock_timestamp() - _st)::text, NULL);
            RAISE EXCEPTION 'Error occurred in the procedure %: %', _sp_name, SQLERRM;
    END;
END
$procedure$;
