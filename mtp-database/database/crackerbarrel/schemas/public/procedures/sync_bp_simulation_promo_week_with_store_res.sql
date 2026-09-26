--liquibase formatted sql
--changeset yashraj.jha@impactanalytics.co:hardcoded datytype as sync_bp_simulation_promo_week_with_store_res_1 runOnChange:true stripComments:false splitStatements:false context:Release_3 labels:CI-137
--comment: hardcoded datytype as sync_bp_simulation_promo_week_with_store_res_1

DROP PROCEDURE IF EXISTS public.sync_bp_simulation_promo_week_with_store_res();

CREATE OR REPLACE PROCEDURE public.sync_bp_simulation_promo_week_with_store_res()
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
DECLARE
    v_start_date date;
    v_end_date date;
        _log_code varchar := gen_random_uuid();
        _sp_name varchar := 'public.sync_bp_simulation_promo_week_with_store_res';
        _log_step varchar;
        _st TIMESTAMP := clock_timestamp();
BEGIN
        call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
        perform set_config('local.log_code', _log_code, true);
        perform set_config('local.sp_name', _sp_name, true);
        begin
    SELECT MIN(week_start_date), MAX(week_start_date)
    INTO v_start_date, v_end_date
    FROM public.bp_simulation_promo_week_with_store_res;

    IF v_start_date IS NOT NULL AND v_end_date IS NOT NULL THEN
        CALL base_pricing_restaurant.sp_create_weekly_partitions(
            'bp_simulation_promo_week_with_store',
            v_start_date,
            v_end_date
        );
    END IF;

    TRUNCATE TABLE base_pricing_restaurant.bp_simulation_promo_week_with_store CASCADE;

    DROP INDEX IF EXISTS base_pricing_restaurant.idx_bp_simulation_promo_week_with_store_id1;

    INSERT INTO base_pricing_restaurant.bp_simulation_promo_week_with_store
    (
        product_id,
        store_id,
        channel_id,
        segment_id,
        week_start_date,
        promo_source,
        reference_price,
        weighted_promo_percent,
        effective_reference_price
    )
    SELECT
        product_id,
        store_id,
        channel_id,
        segment_id,
        week_start_date,
        promo_source,
        reference_price::float4,
        weighted_promo_percent,
        effective_reference_price::float4
    FROM public.bp_simulation_promo_week_with_store_res
    GROUP BY
        1,2,3,4,5,6,7,8,9;


    CREATE INDEX idx_bp_simulation_promo_week_with_store_id1
    ON base_pricing_restaurant.bp_simulation_promo_week_with_store USING btree (product_id);

                call global.data_ingestion_logs(_log_code, _sp_name, 'end', null, (clock_timestamp() - _st)::text, null);
        exception
                when others then
                -- Log the error if an exception occurs during any part of the procedure
                call global.data_ingestion_logs(_log_code, _sp_name, _log_step, SQLERRM, (clock_timestamp() - _st)::text, null);
            raise exception 'Error occurred in the procedure: %', SQLERRM;
        end;
END;
$procedure$
;
