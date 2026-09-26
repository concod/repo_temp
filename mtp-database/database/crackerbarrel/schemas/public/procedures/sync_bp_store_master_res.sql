--liquibase formatted sql
--changeset yashraj.jha@impactanalytics.co:hardcoded datytype as sync_bp_store_master_res_1 runOnChange:true stripComments:false splitStatements:false context:Release_3 labels:CI-137
--comment: hardcoded datytype as sync_bp_store_master_res_1

DROP PROCEDURE IF EXISTS public.sync_bp_store_master_res();

CREATE OR REPLACE PROCEDURE public.sync_bp_store_master_res()
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
        declare
        _log_code varchar := gen_random_uuid();
        _sp_name varchar := 'public.sync_bp_store_master_res';
        _log_step varchar;
        _st TIMESTAMP := clock_timestamp();
BEGIN
        call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
        perform set_config('local.log_code', _log_code, true);
        perform set_config('local.sp_name', _sp_name, true);
        begin
    -- Step 1: Truncate target table before loading new data
    TRUNCATE TABLE base_pricing_restaurant.bp_store_master CASCADE;

    -- Step 2: Insert data from public schema
    INSERT INTO base_pricing_restaurant.bp_store_master
    (
        store_id,
        s0_name, s0_cid, s0_id,
        s1_name, s1_cid, s1_id,
        s2_name, s2_cid, s2_id,
        s3_name, s3_cid, s3_id,
        s4_name, s4_cid, s4_id,
        s5_name, s5_cid, s5_id,
        store_code,
        store_name,
        active,
        open_date,
        close_date,
        address,
        city,
        price_zone
    )
    SELECT
                store_id,
        TRIM(UPPER(s0_name)), s0_cid, TRIM(UPPER(s0_id)),
        TRIM(UPPER(s1_name)), s1_cid, TRIM(UPPER(s1_id)),
        TRIM(UPPER(s2_name)), s2_cid, TRIM(UPPER(s2_id)),
        TRIM(UPPER(s3_name)), s3_cid, TRIM(UPPER(s3_id)),
        TRIM(UPPER(s4_name)), s4_cid, TRIM(UPPER(s4_id)),
        TRIM(UPPER(s5_name)), s5_cid, TRIM(UPPER(s5_id)),
        TRIM(UPPER(store_code)),
        TRIM(UPPER(store_name)),
        active,
        open_date,
        close_date,
        TRIM(UPPER(address)),
        TRIM(UPPER(city)),
        TRIM(UPPER(price_zone))
    FROM public.bp_store_master_res
    GROUP BY
        1, 2, 3, 4, 5, 6, 7, 8, 9, 10,
        11, 12, 13, 14, 15, 16, 17, 18, 19, 20,
        21, 22, 23, 24,25,26,27;

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
