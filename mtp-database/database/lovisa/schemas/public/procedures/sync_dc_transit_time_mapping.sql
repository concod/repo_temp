--liquibase formatted sql
--changeset aleena.reji:sync_dc_transit_time_mapping_v4 stripComments:false splitStatements:false runOnChange:true context:Release_1_0 labels:liquibase_project_start
--comment: added if exist public table condition for sync_dc_transit_time_mapping_v4

DROP PROCEDURE IF EXISTS public.sync_dc_transit_time_mapping();
CREATE OR REPLACE PROCEDURE public.sync_dc_transit_time_mapping()
 LANGUAGE plpgsql
AS $procedure$
DECLARE
    _st TIMESTAMP := clock_timestamp();
    _log_code varchar := gen_random_uuid();
    _sp_name varchar := 'public.sync_dc_transit_time_mapping';
    _log_step varchar;
BEGIN

    CALL global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
    PERFORM set_config('local.log_code', _log_code, true);
    PERFORM set_config('local.sp_name', _sp_name, true);
  
    IF to_regclass('public.dc_transit_time_mapping') IS NULL THEN
        RAISE NOTICE 'Table public.dc_transit_time_mapping does not exist. Exiting procedure.';
        CALL global.data_ingestion_logs(_log_code, _sp_name, 'end - table missing', null, (clock_timestamp() - _st)::text, null);
        RETURN;
    END IF;

   
    BEGIN
        _log_step := 'Insert new dc_transit_time_mapping records';
        PERFORM set_config('local.log_step', _log_step, true);
        
        -- INSERT
        PERFORM public.parellel_insert('
            WITH rows AS (
                INSERT INTO inventory_smart.dc_transit_time_mapping (mapping_code, transit_time) 
                SELECT 
                    DISTINCT
                    x.mapping_code, 
                    x.transit_time 
                FROM
                    public.dc_transit_time_mapping x 
                    JOIN (select mapping_code as m_code FROM global.product_mapping_store_dc  group by mapping_code) pmsd
                        ON pmsd.m_code = x.mapping_code
                {where} and x.action_type = ''insert'' AND x.mapping_code NOT IN (
              SELECT i.mapping_code FROM inventory_smart.dc_transit_time_mapping i)
                RETURNING 1
            )
            SELECT count(1) as cnt FROM rows;', 
            50, 'public.dc_transit_time_mapping x WHERE x.action_type = ''insert''', 'mapping_code', NULL, 50
        );

        RAISE NOTICE 'Inserting completed in %', (clock_timestamp() - _st);
        CALL global.data_ingestion_logs(_log_code, _sp_name, _log_step, null, (clock_timestamp() - _st)::text, null);

        _log_step := 'Update existing dc_transit_time_mapping records';
        PERFORM set_config('local.log_step', _log_step, true);
        
        -- UPDATE
        PERFORM public.parellel_insert('
            WITH rows AS (
                UPDATE inventory_smart.dc_transit_time_mapping i
                SET transit_time = x.transit_time
                FROM public.dc_transit_time_mapping x
                {where} and i.mapping_code = x.mapping_code
                  AND x.action_type = ''update''
                RETURNING 1
            )
            SELECT count(1) as cnt FROM rows;', 
            50, 'public.dc_transit_time_mapping x WHERE x.action_type = ''update''', 'mapping_code', NULL, 50
        );

        RAISE NOTICE 'Updating completed in %', (clock_timestamp() - _st);
        CALL global.data_ingestion_logs(_log_code, _sp_name, _log_step, null, (clock_timestamp() - _st)::text, null);

    EXCEPTION
        WHEN OTHERS THEN
            -- Log the error if an exception occurs during any part of the procedure
            CALL global.data_ingestion_logs(_log_code, _sp_name, _log_step, SQLERRM, (clock_timestamp() - _st)::text, null);
            RAISE EXCEPTION 'Error occurred in the procedure: %', SQLERRM;
    END;

    CALL global.data_ingestion_logs(_log_code, _sp_name, 'end', null, (clock_timestamp() - _st)::text, null);

END
$procedure$
;