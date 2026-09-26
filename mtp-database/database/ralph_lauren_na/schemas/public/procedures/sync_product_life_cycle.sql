--liquibase formatted sql
--changeset abhi.bhardwaj@impactanalytics.co:sync_product_life_cycle_key_delta_latest runOnChange:true stripComments:false splitStatements:false context:sync product life cycle labels:MTP-69612
--comment: sync_product_life_cycle_key_delta_latest
--rollback: SELECT 1

DROP PROCEDURE IF EXISTS public.sync_product_life_cycle();

CREATE OR REPLACE PROCEDURE public.sync_product_life_cycle()
LANGUAGE plpgsql
AS $procedure$
DECLARE
		_worker text;
    _log_code   VARCHAR := gen_random_uuid();
    _sp_name    VARCHAR := 'public.sync_product_life_cycle';
    _log_step   VARCHAR;
    _st         TIMESTAMP := clock_timestamp();
BEGIN
    CALL global.data_ingestion_logs(
        _log_code,
        _sp_name,
        'start',
        NULL,
        (clock_timestamp() - _st)::TEXT,
        NULL
    );

    PERFORM set_config('local.log_code', _log_code, TRUE);
    PERFORM set_config('local.sp_name', _sp_name, TRUE);

    BEGIN
        RAISE NOTICE 'Product Life Cycle delta load (latest per article, store_code) started';

        ------------------------------------------------------------------
        -- STEP 1: DELETE older records when a newer one exists in source
        ------------------------------------------------------------------
        DELETE FROM inventory_smart.product_life_cycle tgt
        USING public.product_life_cycle src
        WHERE
            tgt.article = src.article
        AND tgt.store_code = src.store_code
        AND src.updated_at > tgt.updated_at;

        ------------------------------------------------------------------
        -- STEP 2: INSERT new or latest records
        ------------------------------------------------------------------
        PERFORM public.parellel_insert(
        'WITH rows AS (
            INSERT INTO inventory_smart.product_life_cycle
            (
                article,
                store_code,
                markdown_date,
                clearance_date,
                launch_date,
                current_status,
                updated_by,
                updated_at,
                next_markdown_start_date,
                next_clearance_start_date,
                next_markdown_end_date,
                next_clearance_end_date,
                l0_name,
                upload_flag
            )
            SELECT
                pl.article,
                pl.store_code,
                pl.markdown_date,
                pl.clearance_date,
                pl.launch_date,
                pl.current_status,
                pl.updated_by,
                pl.updated_at,
                pl.next_markdown_start_date,
                pl.next_clearance_start_date,
                pl.next_markdown_end_date,
                pl.next_clearance_end_date,
                paf.l0_name,
                pl.upload_flag
            FROM public.product_life_cycle pl
            LEFT JOIN inventory_smart.product_life_cycle tgt
                ON tgt.article = pl.article
               AND tgt.store_code = pl.store_code
            LEFT JOIN (
                SELECT article, l0_name
                FROM "global".product_attributes_filter
                GROUP BY 1,2
            ) paf USING (article)
            WHERE tgt.article IS NULL
            GROUP BY
                1,2,3,4,5,6,7,8,9,10,11,12,13,14
            RETURNING 1
        )
        SELECT COUNT(1) FROM rows;',
        100,
        'public.product_life_cycle',
        'store_code',
        'plc_store_code_idx'
        );

        RAISE NOTICE 'Product Life Cycle delta load completed: %', (clock_timestamp() - _st);

        CALL global.data_ingestion_logs(
            _log_code,
            _sp_name,
            'end',
            NULL,
            (clock_timestamp() - _st)::TEXT,
            NULL
        );

    EXCEPTION
        WHEN OTHERS THEN
            CALL global.data_ingestion_logs(
                _log_code,
                _sp_name,
                _log_step,
                SQLERRM,
                (clock_timestamp() - _st)::TEXT,
                NULL
            );
            RAISE EXCEPTION 'Error occurred in sync_product_life_cycle: %', SQLERRM;
    END;
END;
$procedure$;
