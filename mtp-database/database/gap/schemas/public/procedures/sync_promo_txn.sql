--liquibase formatted sql
--changeset sreevathsa.sp:sync_promo_txn_v1 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:sync_promo_txn
--comment: initial changeset for sync_promo_txn
--rollback: SELECT 1

DROP PROCEDURE IF EXISTS public.sync_promo_txn();

CREATE OR REPLACE PROCEDURE public.sync_promo_txn()
 LANGUAGE plpgsql
AS $procedure$

declare
    _log_code varchar := gen_random_uuid();
    _sp_name varchar := 'public.sync_promo_txn';
    _log_step varchar;
    _st TIMESTAMP := clock_timestamp();
    _worker text;
begin
    call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
    perform set_config('local.log_code', _log_code, true);
    perform set_config('local.sp_name', _sp_name, true);
    begin

        -- Create partitions for 150 weeks backward
        raise notice 'step_01_start:%',(clock_timestamp() - _st);
        SELECT async_query INTO _worker FROM public.async_query('call public.pc_create_date_partitions(''price_promo_opt'', ''promo_txn'', ''day'', ''70 week'', ''backward'');');
        PERFORM public.async_query_status(_worker, 'cleanup');

        raise notice 'step_01_end:%',(clock_timestamp() - _st);

        _log_step := 'parallel_upsert';
        raise notice 'step_02_start:%',(clock_timestamp() - _st);
        perform public.parellel_insert(
            'WITH rows AS (
                INSERT INTO price_promo_opt.promo_txn (
                    product_id,
                    date_id,
                    store_id,
                    currency,
                    currency_id,
                    no_of_txn,
                    cost,
                    promo_base_price,
                    quantity,
                    revenue,
                    margin,
                    selling_price,
                    promo_spend,
                    promo_discount,
                    price_spend,
                    price_discount,
                    coupon_spend,
                    coupon_discount,
                    aur,
                    aum,
                    clearance_indicator,
                    store_reco_level,
                    inventory
                )
                SELECT
                    product_id,
                    date_id,
                    store_id,
                    currency,
                    currency_id,
                    promo_no_of_txn,
                    promo_cost,
                    promo_base_price,
                    promo_quantity,
                    promo_revenue,
                    promo_margin,
                    promo_selling_price,
                    promo_spend,
                    promo_discount,
                    promo_price_spend,
                    promo_price_discount,
                    promo_coupon_spend,
                    promo_coupon_discount,
                    promo_aur,
                    promo_aum,
                    promo_clearance_indicator,
                    store_reco_level,
                    promo_inventory
                FROM public.tb_transaction_promo_mkd_combined t1
                {where}
                ON CONFLICT (product_id, date_id, store_id)
                DO UPDATE SET
                    currency = EXCLUDED.currency,
                    currency_id = EXCLUDED.currency_id,
                    no_of_txn = EXCLUDED.no_of_txn,
                    cost = EXCLUDED.cost,
                    promo_base_price = EXCLUDED.promo_base_price,
                    quantity = EXCLUDED.quantity,
                    revenue = EXCLUDED.revenue,
                    margin = EXCLUDED.margin,
                    selling_price = EXCLUDED.selling_price,
                    promo_spend = EXCLUDED.promo_spend,
                    promo_discount = EXCLUDED.promo_discount,
                    price_spend = EXCLUDED.price_spend,
                    price_discount = EXCLUDED.price_discount,
                    coupon_spend = EXCLUDED.coupon_spend,
                    coupon_discount = EXCLUDED.coupon_discount,
                    aur = EXCLUDED.aur,
                    aum = EXCLUDED.aum,
                    clearance_indicator = EXCLUDED.clearance_indicator,
                    store_reco_level = EXCLUDED.store_reco_level,
                    inventory = EXCLUDED.inventory
                RETURNING 1
            )
            SELECT count(1) as cnt FROM rows;',
            50,
            'public.tb_transaction_promo_mkd_combined',
            'product_id',
            'tpmc_product_id_idx',
            30
        );
        raise notice 'step_02_end:%',(clock_timestamp() - _st);
        call global.data_ingestion_logs(_log_code, _sp_name, 'end', null, (clock_timestamp() - _st)::text, null);
    exception
        when others then
            -- Log the error if an exception occurs during any part of the procedure
            call global.data_ingestion_logs(_log_code, _sp_name, _log_step, SQLERRM, (clock_timestamp() - _st)::text, null);
            raise exception 'Error occurred in the procedure: %', SQLERRM;
    end;
end
$procedure$
;