--liquibase formatted sql
--changeset yashraj.jha@impactanalytics.co:hardcoded datytype as sync_bp_customer_segment_master_res_1 runOnChange:true stripComments:false splitStatements:false context:Release_3 labels:CI-137
--comment: hardcoded datytype as sync_bp_customer_segment_master_res_1

DROP PROCEDURE IF EXISTS public.sync_bp_customer_segment_master_res();

CREATE OR REPLACE PROCEDURE public.sync_bp_customer_segment_master_res()
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
        declare
        _log_code varchar := gen_random_uuid();
        _sp_name varchar := 'public.sync_bp_customer_segment_master_res';
        _log_step varchar;
        _st TIMESTAMP := clock_timestamp();
BEGIN
        call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
        perform set_config('local.log_code', _log_code, true);
        perform set_config('local.sp_name', _sp_name, true);
        begin
    -- Step 1: Clear target table before inserting new data
    TRUNCATE TABLE base_pricing_restaurant.bp_customer_segment_master CASCADE;

    -- Step 2: Insert data from public table
    INSERT INTO base_pricing_restaurant.bp_customer_segment_master
    (
        segment_id,
        segment_code,
        segment_name,
        segment_description,
        is_active,
        tenant_id
    )
    SELECT
        segment_id,
        segment_code,
        segment_name,
        segment_description,
        is_active,
        tenant_id
    FROM public.bp_customer_segment_master_res
    GROUP BY
        1, 2, 3, 4, 5, 6;

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
