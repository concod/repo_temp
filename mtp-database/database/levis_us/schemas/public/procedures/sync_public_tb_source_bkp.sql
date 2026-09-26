--liquibase formatted sql
--changeset aaqib.khan:initial changeset for sync_tb_source_bckup runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for sync_tb_source_bckup
--rollback: SELECT 1

DROP PROCEDURE if exists public.sync_public_tb_source_bkp();

CREATE OR REPLACE PROCEDURE public.sync_public_tb_source_bkp()
 LANGUAGE plpgsql
AS $procedure$
declare
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'public.public_tb_source_bkp';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
BEGIN
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
  INSERT INTO size_smart.public_tb_source_bkp (
    planning_group_name,
    size_name,
    order_number,
    profile_name,
    profile_label,
    created_at,
    updated_at
)
SELECT
    planning_group_name,
    size_name,
    order_number,
    profile_name,
    profile_label,
    created_at::timestamptz,
    updated_at::timestamptz
FROM public.tb_source;

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
