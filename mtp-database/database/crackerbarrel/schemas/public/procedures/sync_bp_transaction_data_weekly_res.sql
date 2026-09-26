--liquibase formatted sql
--changeset yashraj.jha@impactanalytics.co:hardcoded datytype as sync_bp_transaction_data_weekly_res_1 runOnChange:true stripComments:false splitStatements:false context:Release_3 labels:CI-137
--comment: hardcoded datytype as sync_bp_transaction_data_weekly_res_1

DROP PROCEDURE IF EXISTS public.sync_bp_transaction_data_weekly_res();

CREATE OR REPLACE PROCEDURE public.sync_bp_transaction_data_weekly_res()
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
DECLARE
    v_min_week date;
    v_max_week date;
        _log_code varchar := gen_random_uuid();
        _sp_name varchar := 'public.sync_bp_transaction_data_weekly_res';
        _log_step varchar;
        _st TIMESTAMP := clock_timestamp();
BEGIN
        call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
        perform set_config('local.log_code', _log_code, true);
        perform set_config('local.sp_name', _sp_name, true);
        begin
    
    SELECT 
        MIN(week_start_date),
        MAX(week_start_date)
    INTO 
        v_min_week,
        v_max_week
    FROM public.bp_transaction_data_weekly_res;

    IF v_min_week IS NULL OR v_max_week IS NULL THEN
        RAISE NOTICE 'No data in public.bp_transaction_data_weekly_res';
        RETURN;
    END IF;

   
    CALL base_pricing_restaurant.sp_create_weekly_partitions(
        'bp_transaction_data_weekly',
        v_min_week,
        v_max_week
    );

    
    TRUNCATE TABLE base_pricing_restaurant.bp_transaction_data_weekly CASCADE;

   
    DROP INDEX IF EXISTS base_pricing_restaurant.idx_bp_transaction_data_weekly_id1;
    DROP INDEX IF EXISTS base_pricing_restaurant.idx_bp_transaction_data_weekly_id2;
    DROP INDEX IF EXISTS base_pricing_restaurant.idx_bp_transaction_data_weekly_id3;
    DROP INDEX IF EXISTS base_pricing_restaurant.idx_bp_transaction_data_weekly_main;

    
    INSERT INTO base_pricing_restaurant.bp_transaction_data_weekly
    (
        week_start_date,
        product_id,
        store_id,
        channel_id,
        price_zone,
        segment_id,
        transactions,
        sales_units,
        total_base_cost,
        total_additional_cost,
        sourced_unit_price,
        retail_unit_price,
        total_sales_price,
        total_revenue,
        total_margin,
        total_contri_margin
    )
    SELECT
        week_start_date,
        product_id,
        store_id,
        channel_id,
        price_zone,
        segment_id,
        transactions,
        sales_units::float8,
        total_base_cost::float8,
        total_additional_cost::float8,
        sourced_unit_price::float8,
        retail_unit_price::float8,
        total_sales_price::float8,
        total_revenue::float8,
        total_margin::float8,
        0::float8 AS total_contri_margin    
    FROM public.bp_transaction_data_weekly_res
    GROUP BY
        1, 2, 3, 4, 5, 6,
        7, 8, 9, 10, 11, 12, 13, 14, 15;

    CREATE INDEX idx_bp_transaction_data_weekly_main
        ON base_pricing_restaurant.bp_transaction_data_weekly USING btree (product_id, store_id, segment_id);
    CREATE INDEX idx_bp_transaction_data_weekly_id1
        ON base_pricing_restaurant.bp_transaction_data_weekly USING btree (product_id);
    CREATE INDEX idx_bp_transaction_data_weekly_id2
        ON base_pricing_restaurant.bp_transaction_data_weekly USING btree (store_id);
    CREATE INDEX idx_bp_transaction_data_weekly_id3
        ON base_pricing_restaurant.bp_transaction_data_weekly USING btree (segment_id);

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
