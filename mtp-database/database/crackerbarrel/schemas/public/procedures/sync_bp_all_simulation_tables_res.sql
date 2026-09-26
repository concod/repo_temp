--liquibase formatted sql
--changeset yashraj.jha@impactanalytics.co:hardcoded datytype as sync_bp_all_simulation_tables_res_1 runOnChange:true stripComments:false splitStatements:false context:Release_3 labels:CI-137
--comment: hardcoded datytype as sync_bp_all_simulation_tables_res_1

DROP PROCEDURE IF EXISTS public.sync_bp_all_simulation_tables_res();

CREATE OR REPLACE PROCEDURE public.sync_bp_all_simulation_tables_res()
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
        declare
        _log_code varchar := gen_random_uuid();
        _sp_name varchar := 'public.sync_bp_all_simulation_tables_res';
        _log_step varchar;
        _st TIMESTAMP := clock_timestamp();
BEGIN
        call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
        perform set_config('local.log_code', _log_code, true);
        perform set_config('local.sp_name', _sp_name, true);
        begin

    RAISE NOTICE 'Running sync_bp_simulation_week_res...';
    CALL public.sync_bp_simulation_week_res();

--    RAISE NOTICE 'Running sync_bp_simulation_promo_week_with_store_res...';
--    CALL public.sync_bp_simulation_promo_week_with_store_res();

--    RAISE NOTICE 'Running sync_bp_simulation_store_split_ratio_res...';
--    CALL public.sync_bp_simulation_store_split_ratio_res();

    RAISE NOTICE 'Running sync_bp_simulation_store_split_ratio_kvi_res...';
    CALL public.sync_bp_simulation_store_split_ratio_kvi_res();

    RAISE NOTICE 'Running sync_bp_simulation_day_split_ratio_kvi_res...';
    CALL public.sync_bp_simulation_day_split_ratio_kvi_res();

    RAISE NOTICE 'All simulation tables synced successfully.';
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
