--liquibase formatted sql
--changeset ashish@impactanalytics.co:data_ingestion_logs runOnChange:true stripComments:false splitStatements:false context:DAT-908 labels:data_ingestion_logs
--comment: Initial changeset for data_ingestion_logs
--rollback: SELECT 1
DROP PROCEDURE IF EXISTS global.data_ingestion_logs(IN _log_code text, _target_table_sp text, _status text, _error_message text, _comments TEXT, _params JSONB);
CREATE OR REPLACE PROCEDURE global.data_ingestion_logs(IN _log_code text, IN _target_table_sp text, IN _status text, IN _error_message text, IN _comments text, IN _params jsonb)
 LANGUAGE plpgsql
AS $procedure$
declare
        _worker text;
        _sql text;
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'global.data_ingestion_logs';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
    BEGIN
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
        _sql := '
            DO
            LANGUAGE plpgsql
            $$
                BEGIN
                    INSERT INTO global.data_ingestion_logs (log_code, target_table_sp, status, error_message, comments, params) 
                    VALUES (' || quote_literal(_log_code) || ', ' || quote_literal(_target_table_sp) || ', ' || quote_literal(_status) || ',  ' || coalesce(quote_literal(_error_message), quote_literal('')) || ',  ' || coalesce(quote_literal(_comments), quote_literal('')) || ',  ' || coalesce(quote_literal(_params::text), quote_literal('{}')) || ');
                EXCEPTION
                    WHEN OTHERS THEN
                    RAISE NOTICE ''Error logging to ingestion_logs: %'', SQLERRM;
                END;
            $$;';
--      raise notice '_sql: %', _sql;
		if current_setting('server_version_num')::int >= 170000 then
	        SELECT async_query INTO _worker FROM public.async_query(_sql);
	        PERFORM public.async_query_status(_worker, 'cleanup');
		else
			execute _sql;
		end if;
		call global.data_ingestion_logs(_log_code, _sp_name, 'end', null, (clock_timestamp() - _st)::text, null);
    END
$procedure$
;
