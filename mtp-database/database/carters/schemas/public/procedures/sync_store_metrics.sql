--liquibase formatted sql
--changeset srinivasgowda.sg@impactanalytics.co:sync_store_metrics runOnChange:true stripComments:false splitStatements:false context:po_sp labels:project start
--comment: created procedure sync_store_metrics
--rollback: SELECT 1

DROP PROCEDURE IF EXISTS public.sync_store_metrics(bool);

CREATE OR REPLACE PROCEDURE public.sync_store_metrics(IN p_is_historic boolean)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
DECLARE
    v_base_table TEXT;
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'public.sync_store_metrics';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
BEGIN
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
    -- Set base table based on parameter
    IF p_is_historic THEN
        v_base_table := 'store_metrics_ct_ingestion';
        -- Delete all existing data from target table only if historic mode
        DELETE FROM space_smart.store_metrics;
        RAISE NOTICE 'Historic mode: Deleted all records from space_smart.store_metrics';
    ELSE
        v_base_table := 'store_metrics_ct_level_weekly';
        RAISE NOTICE 'Periodic mode: Skipping delete operation';
    END IF;
    
    RAISE NOTICE 'Using base table: %', v_base_table;
    
    -- Insert data from selected base table using dynamic SQL
    EXECUTE format('
        INSERT INTO space_smart.store_metrics (
            store_number,
            season,
            l4_name,
            gender,
            l3_name,
            l5_name,
            parent_block,
            store_parent_block,
            status,
            space_elasticity,
            sales,
            gm,
            forecasted_units,
            optimized_min_cc,
            optimized_max_cc,
            last_optimized,
            last_optimized_by,
            last_optimized_level,
            store_group,
            sellable_sqft,
            l0_name,
            l1_name,
            l2_name,
            ml_per_parent_block
        )
        SELECT 
            store_number,
            season,
            l4_name,
            gender,
            l3_name,
            l5_name,
            parent_block,
            store_parent_block,
            status,
            space_elasticity,
            sales,
            gm,
            forecasted_units,
            optimized_min_cc,
            optimized_max_cc,
            last_optimized,
            last_optimized_by,
            last_optimized_level,
            store_group,
            sellable_sqft,
            l0_name,
            l1_name,
            l2_name,
            ml_per_parent_block
        FROM public.%I
    ', v_base_table);
    
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
