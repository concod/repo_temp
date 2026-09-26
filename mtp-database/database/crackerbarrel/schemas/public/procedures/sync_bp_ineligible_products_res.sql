--liquibase formatted sql
--changeset yashraj.jha@impactanalytics.co:hardcoded datytype as sync_bp_ineligible_products_res_1 runOnChange:true stripComments:false splitStatements:false context:Release_3 labels:CI-137
--comment: hardcoded datytype as sync_bp_ineligible_products_res_1

DROP PROCEDURE IF EXISTS public.sync_bp_ineligible_products_res();

CREATE OR REPLACE PROCEDURE public.sync_bp_ineligible_products_res()
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
DECLARE
    _log_code  varchar := gen_random_uuid();
    _sp_name   varchar := 'public.sync_bp_ineligible_products_res';
    _log_step  varchar;
    _st        timestamp := clock_timestamp();
BEGIN
    CALL global.data_ingestion_logs(
        _log_code,
        _sp_name,
        'start',
        NULL,
        (clock_timestamp() - _st)::text,
        NULL
    );

    PERFORM set_config('local.log_code', _log_code, true);
    PERFORM set_config('local.sp_name', _sp_name, true);

    BEGIN
        _log_step := 'cleanup_old_history';

        -- Keep only last 10 days of history
        DELETE FROM base_pricing_restaurant.bp_ineligible_products
        WHERE updated_at::date < CURRENT_DATE - INTERVAL '10 days';

        _log_step := 'delete_today_snapshot';

        -- Remove today's snapshot before reload
        DELETE FROM base_pricing_restaurant.bp_ineligible_products
        WHERE updated_at::date = CURRENT_DATE;

        _log_step := 'insert_today_snapshot';

        -- Insert fresh snapshot from public
        INSERT INTO base_pricing_restaurant.bp_ineligible_products (product_id)
        SELECT DISTINCT product_id
        FROM public.bp_ineligible_products_res;

        CALL global.data_ingestion_logs(
            _log_code,
            _sp_name,
            'end',
            NULL,
            (clock_timestamp() - _st)::text,
            NULL
        );

    EXCEPTION
        WHEN OTHERS THEN
            CALL global.data_ingestion_logs(
                _log_code,
                _sp_name,
                _log_step,
                SQLERRM,
                (clock_timestamp() - _st)::text,
                NULL
            );
            RAISE;
    END;
END
$procedure$
;
