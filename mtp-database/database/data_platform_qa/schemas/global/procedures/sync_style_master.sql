--liquibase formatted sql
--changeset liquibase:sync_style_master runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for sync_style_master
--rollback: SELECT 1
DROP PROCEDURE IF EXISTS global.sync_style_master();
CREATE OR REPLACE PROCEDURE global.sync_style_master()
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
declare
-- variable declaration
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'global.sync_style_master';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
begin
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
	INSERT
		INTO
		style_master(style_code)
	SELECT
		attribute_value AS style_code
	FROM
		"global".product_attributes
	WHERE
		attribute_name = 'style'
	GROUP BY
		1
	ON CONFLICT DO nothing;
		call global.data_ingestion_logs(_log_code, _sp_name, 'end', null, (clock_timestamp() - _st)::text, null);
	exception
		when others then
	        -- Log the error if an exception occurs during any part of the procedure
	        call global.data_ingestion_logs(_log_code, _sp_name, _log_step, SQLERRM, (clock_timestamp() - _st)::text, null);
            raise exception 'Error occurred in the procedure: %', SQLERRM;
	end;
end;
$procedure$
;
