--liquibase formatted sql
--changeset Shaik Azmathulla:create_allocation_data_archival runOnChange:true stripComments:false splitStatements:false context:DAT-866 labels:create_allocation_data_archival
--comment: archival data process.
--rollback: SELECT 1

DROP PROCEDURE IF EXISTS inventory_smart.create_allocation_data_archival();
CREATE OR REPLACE PROCEDURE inventory_smart.create_allocation_data_archival()
LANGUAGE plpgsql
AS $procedure$

DECLARE
    _cutoff_date date;
    _total_data_moved bigint := 0;
    _partitions_dropped_count int := 0;
    _data_exists boolean;
    _old_data_count bigint;
    _clone_table_exists boolean;
    rec record;
    _log_code varchar := gen_random_uuid();
    _sp_name varchar := 'inventory_smart.create_allocation_data_archival';
    _log_step varchar;
    _st TIMESTAMP := clock_timestamp();
    _worker text;
    _async_query text;
BEGIN
    CALL global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
    PERFORM set_config('local.log_code', _log_code, true);
    PERFORM set_config('local.sp_name', _sp_name, true);

    RAISE NOTICE '=== STARTING ALLOCATION DATA ARCHIVAL MANAGEMENT ===';
    
    _log_step := 'Calculate cutoff date and analyze data';
    PERFORM set_config('local.log_step', _log_step, true);
    
    -- Calculate cutoff date
    _cutoff_date := current_date - interval '3 months';
    RAISE NOTICE 'Cutoff date for archival: %', _cutoff_date;
    
    -- Analyze data
    SELECT COUNT(*) INTO _old_data_count
    FROM inventory_smart.create_allocation_result_flat_gurobi 
    WHERE created_at < _cutoff_date AND status = 3;
    
    IF _old_data_count = 0 THEN
        RAISE NOTICE 'No data to archive. Exiting.';
        CALL global.data_ingestion_logs(_log_code, _sp_name, _log_step, 'No data to archive', (clock_timestamp() - _st)::text, null);
        CALL global.data_ingestion_logs(_log_code, _sp_name, 'end', null, (clock_timestamp() - _st)::text, null);
        RETURN;
    END IF;
    
    RAISE NOTICE 'Data to archive: % rows', _old_data_count;
    
    CALL global.data_ingestion_logs(_log_code, _sp_name, _log_step, null, (clock_timestamp() - _st)::text, null);
    
    -- =============================================================================
    -- STEP 1: Create partitions
    -- =============================================================================
    _log_step := 'Create partitions for clone table';
    PERFORM set_config('local.log_step', _log_step, true);

    RAISE NOTICE 'STEP 1: Creating partitions for clone table';
    
   
    -- Build async query for partition creation
    _async_query := 'CALL global.build_list_partitions(''create_allocation_result_flat_gurobi_past_finalized'')';
    
  
    SELECT async_query INTO _worker FROM public.async_query(_async_query);
    PERFORM public.async_query_status(_worker, 'partition_creation');
    RAISE NOTICE 'Step 1: Partition creation completed in %', (clock_timestamp() - _st);
    
    CALL global.data_ingestion_logs(_log_code, _sp_name, _log_step, null, (clock_timestamp() - _st)::text, null);
    
    -- =============================================================================
    -- STEP 2: Move old data 
    -- =============================================================================
    _log_step := 'Move old data to clone table';
    PERFORM set_config('local.log_step', _log_step, true);
    
    RAISE NOTICE 'STEP 2: Moving old data to clone table';
    INSERT INTO inventory_smart.create_allocation_result_flat_gurobi_past_finalized 
    SELECT * FROM inventory_smart.create_allocation_result_flat_gurobi 
    WHERE created_at < _cutoff_date AND status = 3;
    
    GET DIAGNOSTICS _total_data_moved = ROW_COUNT;
    RAISE NOTICE 'Moved % rows', _total_data_moved;
    
    CALL global.data_ingestion_logs(_log_code, _sp_name, _log_step, format('Moved %s rows', _total_data_moved), (clock_timestamp() - _st)::text, null);

    COMMIT;

    -- =============================================================================
    -- STEP 3: Delete old data from main table 
    -- =============================================================================
    _log_step := 'Delete old data from main table ';
    PERFORM set_config('local.log_step', _log_step, true);
    
    RAISE NOTICE 'STEP 3: Deleting old data from main table ';
    
   
    _async_query := 'DELETE FROM inventory_smart.create_allocation_result_flat_gurobi WHERE created_at < ''' || _cutoff_date || ''' AND status = 3';
    

    SELECT async_query INTO _worker FROM public.async_query(_async_query);
    PERFORM public.async_query_status(_worker, 'data_deletion');
    
    RAISE NOTICE 'Step 3: Data deletion completed in %', (clock_timestamp() - _st);
    
    CALL global.data_ingestion_logs(_log_code, _sp_name, _log_step, 'Async data deletion completed', (clock_timestamp() - _st)::text, null);
    
    _log_step := 'Archival process completed successfully';
    PERFORM set_config('local.log_step', _log_step, true);
    
    RAISE NOTICE '=== ARCHIVAL COMPLETED ===';
    RAISE NOTICE 'Rows moved: %, Data deletion: async completed', _total_data_moved;
    
    CALL global.data_ingestion_logs(_log_code, _sp_name, _log_step, format('Success: %s rows moved, data deletion completed async', _total_data_moved), (clock_timestamp() - _st)::text, null);

    CALL global.data_ingestion_logs(_log_code, _sp_name, 'end', null, (clock_timestamp() - _st)::text, null);

END
$procedure$;