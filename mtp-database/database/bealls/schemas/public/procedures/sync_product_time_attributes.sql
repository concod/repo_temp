--liquibase formatted sql
--changeset ujjawal.singh@impactanalytics.co:sync_product_season_time_attribute runOnChange:true stripComments:false splitStatements:false context:ASync_Procedures labels:sync_product_season_time_attribute
--comment: creating sp for sync_product_season_time_attribute

DROP PROCEDURE IF EXISTS public.sync_product_season_time_attribute();

CREATE OR REPLACE PROCEDURE public.sync_product_season_time_attribute(
    IN p_truncate boolean DEFAULT false
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $procedure$
DECLARE
    _log_code varchar := gen_random_uuid();
    _sp_name varchar := 'public.sync_product_season_time_attribute';
    _log_step varchar := 'start';
    _st TIMESTAMP := clock_timestamp();
BEGIN
    -- Optional truncate
    IF p_truncate THEN
        _log_step := 'truncate_product_time_attributes';
        DELETE FROM global.product_time_attributes;
    END IF;

    -- Start log
    CALL global.data_ingestion_logs(
        _log_code, _sp_name, 'start', NULL, (clock_timestamp() - _st)::text, NULL
    );

    PERFORM set_config('local.log_code', _log_code, true);
    PERFORM set_config('local.sp_name', _sp_name, true);

    -- Protected execution block
    BEGIN
        _log_step := 'build_list_partitions';
        CALL global.build_list_partitions('product_time_attributes');

        _log_step := 'insert_product_time_attributes';

        INSERT INTO global.product_time_attributes (
            product_code, attribute_name, attribute_value, start_time, end_time, l0_name
        )
        SELECT DISTINCT
            s.product_code,
            'status' AS attribute_name,
            s.status AS attribute_value,
            season_start_date,
            season_end_date,
            paf.l0_name
        FROM public.productseason_validated_table s
        JOIN global.product_attributes_filter paf USING (product_code)
        ON CONFLICT (product_code, attribute_name, l0_name, start_time)
        DO UPDATE SET attribute_value = EXCLUDED.attribute_value;

        -- Success log
        CALL global.data_ingestion_logs(
            _log_code, _sp_name, 'end', NULL, (clock_timestamp() - _st)::text, NULL
        );

    EXCEPTION WHEN OTHERS THEN
        CALL global.data_ingestion_logs(
            _log_code, _sp_name, _log_step, SQLERRM, (clock_timestamp() - _st)::text, NULL
        );
        RAISE EXCEPTION 'Error in %: %', _sp_name, SQLERRM;
    END;

END;
$procedure$;
