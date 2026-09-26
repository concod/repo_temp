--liquibase formatted sql
--changeset arun.thamma@impactanalytics.co:create_gsm_1 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:create_gsm_feature
--comment: initial changeset for create_gsm
--rollback: SELECT 1
DROP PROCEDURE IF EXISTS global.create_gsm(IN input bpchar);
CREATE PROCEDURE global.create_gsm(IN input bpchar)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
declare
		_ddl_query text;
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'global.create_gsm';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
	BEGIN
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
		_ddl_query := 'CREATE TABLE IF NOT EXISTS global."' || $1 || '" (LIKE global.product_generic_schema_mapping INCLUDING ALL);';
		-- insert statement will come under replicate ddl table later
		raise notice '%',  _ddl_query;
		execute _ddl_query;
		call global.data_ingestion_logs(_log_code, _sp_name, 'end', null, (clock_timestamp() - _st)::text, null);
	exception
		when others then
	        -- Log the error if an exception occurs during any part of the procedure
	        call global.data_ingestion_logs(_log_code, _sp_name, _log_step, SQLERRM, (clock_timestamp() - _st)::text, null);
            raise exception 'Error occurred in the procedure: %', SQLERRM;
	end;
	END;
$procedure$;