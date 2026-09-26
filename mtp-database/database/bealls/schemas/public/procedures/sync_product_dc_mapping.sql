--liquibase formatted sql
--changeset ujjawal.singh@impactanalytics.co:sync_product_dc_mapping runOnChange:true stripComments:false splitStatements:false context:ASync_Procedures labels:sync_product_dc_mapping
--comment:  input for sync_product_dc_mapping

DROP PROCEDURE IF EXISTS public.sync_product_dc_mapping();

CREATE OR REPLACE PROCEDURE public.sync_product_dc_mapping(p_truncate boolean)
LANGUAGE plpgsql
SECURITY DEFINER
AS $procedure$
DECLARE
    _log_code varchar := gen_random_uuid();
    _sp_name  varchar := 'public.sync_product_dc_mapping';
    _log_step varchar;
    _st TIMESTAMP := clock_timestamp();
BEGIN
    CALL global.data_ingestion_logs(_log_code, _sp_name, 'start', NULL, (clock_timestamp() - _st)::text, NULL);
    PERFORM set_config('local.log_code', _log_code, true);
    PERFORM set_config('local.sp_name', _sp_name, true);

    BEGIN
        ----------------------------------------------------------------------
        -- If truncate flag is true → delete existing data from target table
        ----------------------------------------------------------------------
        IF p_truncate THEN
    _log_step := 'truncate_target';
    DELETE FROM global.product_mapping
    WHERE mapping_type = 'product_dc';
END IF;


        ----------------------------------------------------------------------
        -- Insert / Update from source to target
        ----------------------------------------------------------------------
        _log_step := 'insert_or_update';

        INSERT INTO global.product_mapping_product_dc (
            mapping_type, product_code, dc_code, is_active
        )
        SELECT DISTINCT ON (x.product_code, dc.dc_code)
            x.mapping_type,
            x.product_code,
            dc.dc_code,
            x.is_active
        FROM public.product_dc_mapping x
        JOIN global.distribution_centres dc
            ON x.store_code = dc.linked_store_code
        WHERE dc.is_active
        ON CONFLICT (product_code, dc_code)
        DO UPDATE SET
            is_active = EXCLUDED.is_active;

        CALL global.data_ingestion_logs(_log_code, _sp_name, 'end', NULL, (clock_timestamp() - _st)::text, NULL);

    EXCEPTION WHEN OTHERS THEN
        CALL global.data_ingestion_logs(_log_code, _sp_name, _log_step, SQLERRM, (clock_timestamp() - _st)::text, NULL);
        RAISE EXCEPTION 'Error occurred in the procedure: %', SQLERRM;
    END;
END
$procedure$;