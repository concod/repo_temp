--liquibase formatted sql
--changeset rohankumar.sinha@impactanalytics.co:remove_older_data_mrksmrt_txn_latest_mkd() runOnChange:true stripComments:false splitStatements:false context:lovisa_inv_smart labels:remove_older_data_mrksmrt_txn_latest_mkd()
--comment: Changeset for remove_older_data_mrksmrt_txn_latest_mkd()
--rollback: SELECT 1

DROP PROCEDURE if exists public.remove_older_data_mrksmrt_txn_latest_mkd();

CREATE OR REPLACE PROCEDURE public.remove_older_data_mrksmrt_txn_latest_mkd()
LANGUAGE plpgsql
AS $procedure$
DECLARE
    _log_code      varchar := gen_random_uuid();
    _sp_name       varchar := 'public.remove_older_data_mrksmrt_txn_latest_mkd';
    _log_step      varchar;
    _st            TIMESTAMP := clock_timestamp();

    _batch_size    INT := 100000;  
    _rows_deleted  INT := 1;
    _cutoff_date   DATE := CURRENT_DATE - 380;
BEGIN

    -- Start logging
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

        CREATE TEMP TABLE tmp_delete_ctid AS
		    SELECT ctid AS row_id
		    FROM price_markdown_opt.marksmart_transaction_latest_mkd
		    WHERE date_id < CURRENT_DATE - 380;


        DELETE FROM price_markdown_opt.marksmart_transaction_latest_mkd
        WHERE ctid IN (
            SELECT row_id
            FROM tmp_delete_ctid
        );


        -- End logging
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

            RAISE EXCEPTION
                'Error occurred in the procedure: %',
                SQLERRM;
    END;

END;
$procedure$;