--liquibase formatted sql
--changeset abhishek.sagar@impactanalytics.co:sync_store_groups_figs runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:figs_sync_store_groups
--comment: initial changeset for update_store_code_data
--rollback: SELECT 1

DROP PROCEDURE if exists public.sync_store_data(bool);
CREATE OR REPLACE PROCEDURE public.sync_store_data(IN _is_historic boolean DEFAULT false)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
DECLARE
    _log_code varchar := gen_random_uuid();
    _sp_name varchar := 'public.sync_store_data';
    _log_step varchar;
    _st TIMESTAMP := clock_timestamp();
BEGIN
    call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);

    PERFORM set_config('local.log_code', _log_code, true);
    PERFORM set_config('local.sp_name', _sp_name, true);

    BEGIN
        -- Historic ingestion
        IF _is_historic THEN
            _log_step := 'historic_delete';

            DELETE FROM "global".store_code_mapping
            WHERE store_code IN (
                SELECT DISTINCT store_code
                FROM public.store_code_mapping
            );
 END IF;
	
        INSERT INTO "global".store_code_mapping
        (store_code, dummy_store_code, status, created_at, updated_at)
        SELECT DISTINCT
            store_code,
            dummy_store_code,
            status,
            created_at,
            updated_at
        FROM public.store_code_mapping;
		call global.data_ingestion_logs(_log_code, _sp_name, 'end', null, (clock_timestamp() - _st)::text, null);
    EXCEPTION
        WHEN OTHERS THEN
            call global.data_ingestion_logs(_log_code, _sp_name, _log_step, SQLERRM, (clock_timestamp() - _st)::text, null);
            raise exception 'Error occurred in the procedure: %', SQLERRM;
    END;
END;
$procedure$
;
