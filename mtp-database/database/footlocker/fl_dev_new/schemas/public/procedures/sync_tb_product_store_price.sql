--liquibase formatted sql
--changeset sreevathsa.sp:sync_tb_product_store_price_v1 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:sync_tb_product_store_price
--comment: sync tb_product_store_price from public.tb_product_store_price
--rollback: SELECT 1

DROP PROCEDURE IF EXISTS public.sync_tb_product_store_price();

CREATE OR REPLACE PROCEDURE public.sync_tb_product_store_price()
 LANGUAGE plpgsql
AS $procedure$

DECLARE
    _log_code varchar := gen_random_uuid();
    _sp_name  varchar := 'public.sync_tb_product_store_price';
    _log_step varchar;
    _st       timestamp := clock_timestamp();
    _worker   text;
BEGIN
    CALL global.data_ingestion_logs(_log_code, _sp_name, 'start', NULL, (clock_timestamp() - _st)::text, NULL);
    PERFORM set_config('local.log_code', _log_code, true);
    PERFORM set_config('local.sp_name', _sp_name, true);

    BEGIN
        -- Step 2: parallel upsert basic price fields into price_markdown.tb_product_store_price
        _log_step := 'parallel_upsert_base_price';
        RAISE NOTICE 'step_02_start:%', (clock_timestamp() - _st);
        PERFORM public.parellel_insert(
            'WITH rows AS (
                INSERT INTO price_markdown.tb_product_store_price (
                    product_id,
                    store_id,
                    currency_id,
                    msrp,
                    current_price,
                    effective_from_date,
                    updated_at,
                    msrp_with_vat,
                    current_price_with_vat,
                    cost
                )
                SELECT
                    t1.product_id,
                    t1.store_id,
                    t1.currency_id::int4,
                    t1.msrp,
                    t1.current_price,
                    t1.effective_from_date,
                    t1.updated_at,
                    t1.msrp_with_vat,
                    t1.current_price_with_vat,
                    t1.cost
                FROM public.tb_product_store_price t1
                {where}
                ON CONFLICT (product_id, store_id)
                DO UPDATE SET
                    currency_id          = EXCLUDED.currency_id,
                    msrp                 = EXCLUDED.msrp,
                    current_price        = EXCLUDED.current_price,
                    effective_from_date  = EXCLUDED.effective_from_date,
                    updated_at           = EXCLUDED.updated_at,
                    msrp_with_vat        = EXCLUDED.msrp_with_vat,
                    current_price_with_vat = EXCLUDED.current_price_with_vat,
                    cost                 = EXCLUDED.cost
                RETURNING 1
            )
            SELECT count(1) AS cnt FROM rows;',
            50,
            'public.tb_product_store_price',
            'product_id',
            'ptsp_product_id_idx',
            30
        );
        RAISE NOTICE 'step_02_end:%', (clock_timestamp() - _st);

        -- Step 3: parallel upsert promo/detail fields into price_promo.tb_product_store_price
        _log_step := 'parallel_upsert_promo_price';
        RAISE NOTICE 'step_03_start:%', (clock_timestamp() - _st);
        PERFORM public.parellel_insert(
            'WITH rows AS (
                INSERT INTO price_promo.tb_product_store_price (
                    product_id,
                    store_id,
                    customer_id,
                    clearance_indicator,
                    promo_base_price,
                    cost,
                    previous_promo_base_price,
                    last_reg_price,
                    effective_from_date,
                    effective_till_date,
                    currency_id,
                    updated_at,
                    promo_base_price_valid_from,
                    promo_base_price_valid_to
                )
                SELECT
                    t1.product_id,
                    t1.store_id,
                    t1.customer_id,
                    t1.clearance_indicator,
                    t1.promo_base_price,
                    t1.cost,
                    t1.previous_promo_base_price,
                    t1.last_reg_price,
                    t1.effective_from_date,
                    t1.effective_till_date,
                    t1.currency_id,
                    t1.updated_at,
                    t1.promo_base_price_valid_from,
                    t1.promo_base_price_valid_to
                FROM public.tb_product_store_price t1
                {where}
                ON CONFLICT (product_id, store_id)
                DO UPDATE SET
                    clearance_indicator         = EXCLUDED.clearance_indicator,
                    promo_base_price            = EXCLUDED.promo_base_price,
                    cost                        = EXCLUDED.cost,
                    previous_promo_base_price   = EXCLUDED.previous_promo_base_price,
                    last_reg_price              = EXCLUDED.last_reg_price,
                    effective_from_date         = EXCLUDED.effective_from_date,
                    effective_till_date         = EXCLUDED.effective_till_date,
                    currency_id                 = EXCLUDED.currency_id,
                    updated_at                  = EXCLUDED.updated_at,
                    promo_base_price_valid_from = EXCLUDED.promo_base_price_valid_from,
                    promo_base_price_valid_to   = EXCLUDED.promo_base_price_valid_to
                RETURNING 1
            )
            SELECT count(1) AS cnt FROM rows;',
            50,
            'public.tb_product_store_price',
            'product_id',
            'ptsp_product_id_idx',
            30
        );
        RAISE NOTICE 'step_03_end:%', (clock_timestamp() - _st);

        CALL global.data_ingestion_logs(_log_code, _sp_name, 'end', NULL, (clock_timestamp() - _st)::text, NULL);

    EXCEPTION
        WHEN OTHERS THEN
            CALL global.data_ingestion_logs(_log_code, _sp_name, _log_step, SQLERRM, (clock_timestamp() - _st)::text, NULL);
            RAISE EXCEPTION 'Error occurred in the procedure %: %', _sp_name, SQLERRM;
    END;
END
$procedure$;