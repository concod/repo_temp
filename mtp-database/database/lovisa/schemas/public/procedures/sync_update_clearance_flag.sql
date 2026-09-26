--liquibase formatted sql
--changeset aleena.reji@impactanalytics.co:sync_update_clearance_flag_v1 runOnChange:true stripComments:false splitStatements:false context:sync_update_clearance_flag labels:project start
--comment: created procedure sync_update_clearance_flag_v1
--rollback: SELECT 1
DROP PROCEDURE IF EXISTS public.sync_update_clearance_flag();
CREATE OR REPLACE PROCEDURE public.sync_update_clearance_flag()
LANGUAGE plpgsql
AS $procedure$
DECLARE 
    _log_code varchar := gen_random_uuid();
    _sp_name  varchar := 'public.sync_update_clearance_flag';
    _log_step varchar;
    _st       TIMESTAMP := clock_timestamp();
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
        _log_step := 'sync_update_clearance_flag';

        WITH clearance_products AS (
            SELECT DISTINCT product_code
            FROM inventory_smart.article_status_tag
            WHERE LOWER(article_status_tag) = 'clearance'
        )
        UPDATE global.product_attributes_filter paf
        SET clearance_flag = 'Markdown'
        FROM clearance_products cp
        WHERE paf.product_code = cp.product_code and paf.active = true;

        UPDATE global.product_attributes_filter paf
        SET clearance_flag = 'Non Markdown'
        where clearance_flag is null;

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
            RAISE EXCEPTION 'Error occurred in the procedure: %', SQLERRM;
    END;

END;
$procedure$;