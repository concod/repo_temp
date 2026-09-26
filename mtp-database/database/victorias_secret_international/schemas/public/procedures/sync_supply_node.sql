--liquibase formatted sql
--changeset pradeep.kumar@impactanalytics.co:adding_sync_supply_node runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start1
--comment: sync_supply_node
--rollback: SELECT 1

DROP PROCEDURE IF EXISTS public.sync_supply_node();

CREATE OR REPLACE PROCEDURE public.sync_supply_node()
LANGUAGE plpgsql
SECURITY DEFINER
AS $procedure$
declare
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'public.sync_supply_node';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
BEGIN
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
    INSERT INTO inventory_smart.supply_node (
        name,
        code,
        type,
        active,
        created_at,
        updated_at
    )
    SELECT 
        name,
        code,
        type,
        active,
        created_at,
        updated_at
    FROM 
        public.supply_node
    ON CONFLICT (code) DO UPDATE
    SET
        active = EXCLUDED.active,
        updated_at = EXCLUDED.updated_at;
		call global.data_ingestion_logs(_log_code, _sp_name, 'end', null, (clock_timestamp() - _st)::text, null);
	exception
		when others then
	        -- Log the error if an exception occurs during any part of the procedure
	        call global.data_ingestion_logs(_log_code, _sp_name, _log_step, SQLERRM, (clock_timestamp() - _st)::text, null);
            raise exception 'Error occurred in the procedure: %', SQLERRM;
	end;
END;
$procedure$;