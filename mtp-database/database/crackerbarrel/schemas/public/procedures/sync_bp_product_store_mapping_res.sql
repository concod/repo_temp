--liquibase formatted sql
--changeset yashraj.jha@impactanalytics.co:hardcoded datytype as sync_bp_product_store_mapping_res_1 runOnChange:true stripComments:false splitStatements:false context:Release_3 labels:CI-137
--comment: hardcoded datytype as sync_bp_product_store_mapping_res_1

DROP PROCEDURE IF EXISTS public.sync_bp_product_store_mapping_res();

CREATE OR REPLACE PROCEDURE public.sync_bp_product_store_mapping_res()
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
        declare
        _log_code varchar := gen_random_uuid();
        _sp_name varchar := 'public.sync_bp_product_store_mapping_res';
        _log_step varchar;
        _st TIMESTAMP := clock_timestamp();
BEGIN
        call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
        perform set_config('local.log_code', _log_code, true);
        perform set_config('local.sp_name', _sp_name, true);
        begin
    -- Step 1: Clear target table before inserting new data
    TRUNCATE TABLE base_pricing_restaurant.bp_product_store_mapping CASCADE;

    -- Step 2: Insert latest product-store mapping data from public schema
    INSERT INTO base_pricing_restaurant.bp_product_store_mapping
    (
        product_id,
        store_id,
        segment_id,
        channel_id,
        eligibility,
        is_kvi,
        price_lock,
        price,
        base_cost,
		additional_cost,
        total_cost,
        reference_price_1,
        reference_price_2,
                status
    )
    SELECT
        product_id,
        store_id,
        segment_id,
        channel_id,
        TRIM(UPPER(eligibility)) AS eligibility,
        is_kvi,
        price_lock,
        ROUND(price::numeric, 2) AS price,
        base_cost,
		additional_cost,
        ROUND(total_cost::numeric, 2) AS total_cost,
        reference_price_1,
        reference_price_2,
                status
    FROM public.bp_product_store_mapping_res
          WHERE price IS NOT NULL
      AND price > 0
      AND total_cost IS NOT NULL
      AND total_cost > 0
    GROUP BY
        1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11,12,13,14;

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
