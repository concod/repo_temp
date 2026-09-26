--liquibase formatted sql
--changeset aleena.reji@impactanalytics.co:update_auto_allocation_backup() runOnChange:true stripComments:false splitStatements:false context:lovisa_inv_smart labels:update_auto_allocation_backup()
--comment: Changeset for update_auto_allocation_backup()
--rollback: SELECT 1
DROP PROCEDURE IF EXISTS public.update_auto_allocation_backup();
CREATE OR REPLACE PROCEDURE public.update_auto_allocation_backup()
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
DECLARE
    _log_code varchar := gen_random_uuid();
    _sp_name  varchar := 'public.update_auto_allocation_backup';
    _log_step varchar;
    _st       TIMESTAMP := clock_timestamp();
BEGIN
    -- start log
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
        --------------------------------------------------------------------
        -- 1. ARCHIVE OF EXISTING AUTO ALLOCATION PLAN
        --------------------------------------------------------------------

            INSERT INTO inventory_smart.auto_allocation_input_backup (
                range_name,
                row_num,
                article_list,
                l0_name_article_list_map,
                auto_approve_flag,
                int_div,
                user_code,
                allocation_code,
                auto_approve_no,
                allocation_status,
                updated_at,
                store_groups,
                batch_number,
                backup_at
            )
            SELECT
                range_name,
                row_num,
                article_list,
                l0_name_article_list_map,
                auto_approve_flag,
                int_div,
                user_code,
                allocation_code,
                auto_approve_no,
                allocation_status,
                updated_at,
                store_groups,
                batch_number,
                NOW()
            FROM inventory_smart.auto_allocation_input;

        --------------------------------------------------------------------
        -- 2. CLEAN OLD AUTO ALLOCATION RECORDS
        --------------------------------------------------------------------
                    
           DELETE FROM inventory_smart.auto_allocation_input;

        --------------------------------------------------------------------
        -- SUCCESS LOG
        --------------------------------------------------------------------
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
END
$procedure$
;