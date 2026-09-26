--liquibase formatted sql
--changeset ashish@impactanalytics.co:refresh_mv_rt runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: procedure for refresh_mv_rt
DROP PROCEDURE IF EXISTS global.refresh_mv_rt();
CREATE OR REPLACE PROCEDURE global.refresh_mv_rt()
 LANGUAGE plpgsql
AS $procedure$
DECLARE 
	_refresh_mv text;
	_worker text;
	_st TIMESTAMP := clock_timestamp();
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'global.refresh_mv_rt';
	_log_step varchar;
BEGIN

	CALL global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	PERFORM set_config('local.log_code', _log_code, true);
	PERFORM set_config('local.sp_name', _sp_name, true);

	BEGIN
		_log_step := 'Error Step: Triggger if failed';
		_refresh_mv := 'REFRESH MATERIALIZED VIEW CONCURRENTLY inventory_smart.ph_master WITH DATA;';
		select async_query into _worker from public.async_query('call global.execute_as_admin(''' || _refresh_mv || ''');');
		perform dblink_get_result(_worker);
		perform dblink_disconnect(_worker);
	EXCEPTION
		WHEN OTHERS THEN
			-- Log the error with current MV details
			CALL global.data_ingestion_logs(_log_code, _sp_name, _log_step, SQLERRM, (clock_timestamp() - _st)::text, null);
			RAISE EXCEPTION 'Error occurred in the procedure: %', SQLERRM;
	END;

	CALL global.data_ingestion_logs(_log_code, _sp_name, 'end', null, (clock_timestamp() - _st)::text, null);

END;
$procedure$
;
