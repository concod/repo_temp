--liquibase formatted sql
--changeset ujjawal.singh@impactanalytics.co:sync_store_time_attributes runOnChange:true stripComments:false splitStatements:false context:ASync_Procedures labels:sync_store_time_attributes
--comment: creating sp for sync_store_time_attributes_01

DROP PROCEDURE IF EXISTS public.sync_store_time_attributes();


CREATE OR REPLACE PROCEDURE public.sync_store_time_attributes(IN p_truncate boolean)
LANGUAGE plpgsql
SECURITY DEFINER
AS $procedure$
DECLARE
    _log_code varchar := gen_random_uuid();
    _sp_name  varchar := 'public.sync_store_time_attributes';
    _log_step varchar;
    _st TIMESTAMP := clock_timestamp();
BEGIN
    ---------------------------------------------------------------------
    -- Start log
    ---------------------------------------------------------------------
    CALL global.data_ingestion_logs(_log_code, _sp_name, 'start', NULL, (clock_timestamp() - _st)::text, NULL);
    PERFORM set_config('local.log_code', _log_code, TRUE);
    PERFORM set_config('local.sp_name', _sp_name, TRUE);

    BEGIN
        -----------------------------------------------------------------
        -- Optional truncate (Full Refresh)
        -----------------------------------------------------------------
        IF p_truncate THEN
            _log_step := 'truncate_target';
            DELETE FROM global.store_time_attributes;
        END IF;

        -----------------------------------------------------------------
        -- Build partitions
        -----------------------------------------------------------------
        _log_step := 'build_partitions';
        CALL global.build_list_partitions('store_time_attributes');

        -----------------------------------------------------------------
        -- Insert / Update (Upsert)
        -----------------------------------------------------------------
        _log_step := 'insert_upsert';

        INSERT INTO global.store_time_attributes (
            store_code,
            attribute_name,
            attribute_value,
            start_time,
            end_time
        )
        SELECT DISTINCT
            store_code,
            'status' AS attribute_name,
            status AS attribute_value,
            season_start_date::date AS start_time,
            season_end_date::date AS end_time
        FROM public.storeseason_validated_table
        ON CONFLICT (store_code, attribute_name, start_time, end_time)
        DO UPDATE
           SET attribute_value = EXCLUDED.attribute_value;

        -----------------------------------------------------------------
        -- End Log
        -----------------------------------------------------------------
        CALL global.data_ingestion_logs(_log_code, _sp_name, 'end', NULL, (clock_timestamp() - _st)::text, NULL);

    EXCEPTION WHEN OTHERS THEN
        CALL global.data_ingestion_logs(_log_code, _sp_name, _log_step, SQLERRM, (clock_timestamp() - _st)::text, NULL);
        RAISE EXCEPTION 'Error in sync_store_time_attributes: %', SQLERRM;
    END;
END
$procedure$;