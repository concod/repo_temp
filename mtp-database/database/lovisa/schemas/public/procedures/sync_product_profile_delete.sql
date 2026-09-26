--liquibase formatted sql
--changeset aleena.reji:sync_product_profile_delete_v4 stripComments:false splitStatements:false runOnChange:true context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for sync_product_profile_delete_v4


DROP PROCEDURE IF EXISTS public.sync_product_profile_delete();

CREATE OR REPLACE PROCEDURE public.sync_product_profile_delete()
LANGUAGE plpgsql
AS $procedure$
DECLARE 
    _today int;
    _st TIMESTAMP := clock_timestamp();
    _log_code varchar := gen_random_uuid();
    _sp_name varchar := 'public.sync_product_profile_delete';
    _log_step varchar;
    _curr_time TIME := (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Kolkata')::TIME;
BEGIN

    CALL global.data_ingestion_logs(
        _log_code, _sp_name, 'start', NULL, (clock_timestamp() - _st)::text, NULL
    );

    PERFORM set_config('local.log_code', _log_code, TRUE);
    PERFORM set_config('local.sp_name', _sp_name, TRUE);

    SELECT EXTRACT(dow FROM CURRENT_DATE) INTO _today;


        BEGIN
            _log_step := 'historic ingestion';
            PERFORM set_config('local.log_step', _log_step, TRUE);

            PERFORM public.parellel_insert(
                'WITH rows AS (
                    DELETE FROM inventory_smart.product_profile_master {where} 
                    AND special_classification = ''ia-recommended''
                    RETURNING 1
                )
                SELECT count(1) AS cnt FROM rows;',
                50,
                'inventory_smart.product_profile_master where special_classification = ''ia-recommended'' ',
                'pp_code',
                NULL,
                50
            );

            CALL global.data_ingestion_logs(
                _log_code, _sp_name, _log_step, NULL, (clock_timestamp() - _st)::text, NULL
            );

        EXCEPTION WHEN OTHERS THEN
            CALL global.data_ingestion_logs(
                _log_code, _sp_name, _log_step, SQLERRM,
                (clock_timestamp() - _st)::text, NULL
            );
            RAISE EXCEPTION 'Error occurred in the procedure: %', SQLERRM;
        END;

END;
$procedure$;