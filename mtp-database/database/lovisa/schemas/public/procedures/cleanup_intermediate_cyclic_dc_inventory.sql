--liquibase formatted sql
--changeset swapnil.bhange@impactanalytics.co:cleanup_intermediate_cyclic_dc_inventory_v1 runOnChange:true stripComments:false splitStatements:false context:cleanup_intermediate_cyclic_dc_inventory_v1
--comment: Changeset for cleanup_intermediate_cyclic_dc_inventory_v1
--rollback: SELECT 1
DROP PROCEDURE IF EXISTS public.cleanup_intermediate_cyclic_dc_inventory();
CREATE OR REPLACE PROCEDURE public.cleanup_intermediate_cyclic_dc_inventory()
LANGUAGE plpgsql
AS $procedure$
DECLARE
    _worker TEXT;
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'public.cleanup_intermediate_cyclic_dc_inventory';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
BEGIN
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
    -- Check if table exists
    IF to_regclass('public.intermediate_inventory_delta') IS NOT NULL THEN

        SELECT async_query INTO _worker
        FROM public.async_query(
            'DELETE FROM public.intermediate_inventory_delta WHERE TRUE'
        );

        PERFORM public.async_query_status(_worker, 'cleanup');
        RAISE NOTICE 'Cleanup executed successfully on public.intermediate_inventory_delta';

    ELSE
        RAISE NOTICE 'Table public.intermediate_inventory_delta does not exist. Skipping cleanup.';
    END IF;

    RAISE NOTICE 'Execution time: %', (clock_timestamp() - _st);
		call global.data_ingestion_logs(_log_code, _sp_name, 'end', null, (clock_timestamp() - _st)::text, null);
	exception
		when others then
	        -- Log the error if an exception occurs during any part of the procedure
	        call global.data_ingestion_logs(_log_code, _sp_name, _log_step, SQLERRM, (clock_timestamp() - _st)::text, null);
            raise exception 'Error occurred in the procedure: %', SQLERRM;
	end;
END;
$procedure$;