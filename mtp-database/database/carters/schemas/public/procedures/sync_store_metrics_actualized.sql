--liquibase formatted sql
--changeset srinivasgowda.sg@impactanalytics.co:sync_store_metrics_actualized runOnChange:true stripComments:false splitStatements:false context:syncspace labels:project start
--comment: created procedure sync_store_metrics_actualized
--rollback: SELECT 1

DROP PROCEDURE IF EXISTS public.sync_store_metrics_actualized(bool);

CREATE OR REPLACE PROCEDURE public.sync_store_metrics_actualized(IN p_is_historic boolean)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
	declare
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'public.sync_store_metrics_actualized';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
BEGIN
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
    -- Delete all existing data from target table only if historic mode
    IF p_is_historic THEN
        DELETE FROM space_smart.store_metrics_actualized;
        RAISE NOTICE 'Historic mode: Deleted all records from space_smart.store_metrics_actualized';
    ELSE
        RAISE NOTICE 'Non-historic mode: Skipping delete operation';
    END IF;
    
    -- Insert data from base table
    INSERT INTO space_smart.store_metrics_actualized (
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
        actualized_cc,
        attribute_name,
        flag
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
        actualized_cc,
        attribute_name,
        flag
    FROM public.store_metrics_actualize_ct_level on conflict do nothing;
    
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
