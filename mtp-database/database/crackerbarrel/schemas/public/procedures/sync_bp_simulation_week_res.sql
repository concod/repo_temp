--liquibase formatted sql
--changeset yashraj.jha@impactanalytics.co:hardcoded datytype as sync_bp_simulation_week_res_1 runOnChange:true stripComments:false splitStatements:false context:Release_3 labels:CI-137
--comment: hardcoded datytype as sync_bp_simulation_week_res_1

DROP PROCEDURE IF EXISTS public.sync_bp_simulation_week_res();

CREATE OR REPLACE PROCEDURE public.sync_bp_simulation_week_res()
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
DECLARE
    v_start_date DATE;
    v_end_date DATE;
        _log_code varchar := gen_random_uuid();
        _sp_name varchar := 'public.sync_bp_simulation_week_res';
        _log_step varchar;
        _st TIMESTAMP := clock_timestamp();
BEGIN
        call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
        perform set_config('local.log_code', _log_code, true);
        perform set_config('local.sp_name', _sp_name, true);
        begin

    SELECT MIN(week_start_date), MAX(week_start_date)
    INTO v_start_date, v_end_date
    FROM public.bp_simulation_week_res;

    IF v_start_date IS NOT NULL AND v_end_date IS NOT NULL THEN
        -- Direct weekly partition creation for bp_simulation_week
        CALL base_pricing_restaurant.sp_create_weekly_partitions(
            'bp_simulation_week',
            v_start_date,
            v_end_date
        );
    END IF;

    TRUNCATE TABLE base_pricing_restaurant.bp_simulation_week CASCADE;

    DROP INDEX IF EXISTS base_pricing_restaurant.idx_bp_simulation_week_id1;

    INSERT INTO base_pricing_restaurant.bp_simulation_week
    (
        product_id,
        channel_id,
        segment_id,
        week_start_date,
        min_cost,
        base_percentage,
        sim_markup_percentage,
        price_point,
        sales_units,
        elasticity_bp,
        promo_elasticity,
        confidence
    )
    SELECT
        product_id,
        channel_id,
        segment_id,
        week_start_date,
        min_cost,
        base_percentage,
        sim_markup_percentage,
        price_point,
        sales_units,
        elasticity_bp,
        promo_elasticity,
        confidence
    FROM public.bp_simulation_week_res
    GROUP BY
        1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12;

    CREATE INDEX idx_bp_simulation_week_id1
    ON base_pricing_restaurant.bp_simulation_week USING btree (product_id);

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
