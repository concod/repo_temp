--liquibase formatted sql
--changeset srinivasgowda.sg@impactanalytics.co:sync_space_constraints runOnChange:true stripComments:false splitStatements:false context:po_sp labels:project start
--comment: created procedure sync_space_constraints
--rollback: SELECT 1

DROP PROCEDURE IF EXISTS public.sync_space_constraints(bool);

CREATE OR REPLACE PROCEDURE public.sync_space_constraints(IN p_is_historic boolean)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
	declare
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'public.sync_space_constraints';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
BEGIN
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
    -- Delete all existing data from target table only if historic mode
    IF p_is_historic THEN
        DELETE FROM space_smart.space_constraints;
        RAISE NOTICE 'Historic mode: Deleted all records from space_smart.space_constraints';
    ELSE
        RAISE NOTICE 'Non-historic mode: Skipping delete operation';
    END IF;
    
    -- Insert data from base table
    INSERT INTO space_smart.space_constraints (
        l0_name,
        l1_name,
        l2_name,
        l3_name,
        l4_name,
        l5_name,
        sq_ft_control,
        sq_ft_fixed,
        store_code,
        season_code,
        parent_block,
        avg_sqft,
        percentage_contribution,
        sellable_sqft_min_per,
        sellable_sqft_max_per
    )
    SELECT 
        l0_name,
        l1_name,
        l2_name,
        l3_name,
        l4_name,
        l5_name,
        sq_ft_control,
        sq_ft_fixed,
        store_code,
        season_code,
        parent_block,
        avg_sqft,
        percentage_contribution,
        sellable_sqft_min_per,
        sellable_sqft_max_per
    FROM public.space_ct_level_constraints_new_weekly_refresh on conflict do nothing;
    
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
