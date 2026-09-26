--liquibase formatted sql
--changeset himanshubhardwaj:sync_uam_store_hierachy_universe runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for sync_uam_store_hierachy_universe
--rollback: SELECT 1
DROP PROCEDURE IF EXISTS public.sync_uam_store_hierachy_universe();
CREATE OR REPLACE PROCEDURE public.sync_uam_store_hierachy_universe()
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
declare
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'public.sync_uam_store_hierachy_universe';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
BEGIN
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
    CREATE TABLE public.uam_store_hierachy_universe AS 
    WITH one AS (
        SELECT s0_name AS name, 's0_name' AS hierarchy_type
        FROM "global".store_attributes_filter saf
        where active=true
        GROUP BY 1
    ),
    two AS (
        SELECT s1_name AS name, 's1_name' AS hierarchy_type
        FROM "global".store_attributes_filter saf
        WHERE active=true
        GROUP BY 1
    ),
    three AS (
        SELECT s2_name AS name, 's2_name' AS hierarchy_type
        FROM "global".store_attributes_filter saf
        WHERE active=true
        GROUP BY 1
    ),
    final AS (
        SELECT * FROM one
        UNION ALL
        SELECT * FROM two
        UNION ALL
        SELECT * FROM three
    )
    SELECT *, null AS id
    FROM final;
		call global.data_ingestion_logs(_log_code, _sp_name, 'end', null, (clock_timestamp() - _st)::text, null);
	exception
		when others then
	        -- Log the error if an exception occurs during any part of the procedure
	        call global.data_ingestion_logs(_log_code, _sp_name, _log_step, SQLERRM, (clock_timestamp() - _st)::text, null);
            raise exception 'Error occurred in the procedure: %', SQLERRM;
	end;
END
$procedure$;