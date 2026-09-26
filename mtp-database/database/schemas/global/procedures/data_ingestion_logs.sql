--liquibase formatted sql
--changeset ashish@impactanalytics.co:data_ingestion_logs runOnChange:true stripComments:false splitStatements:false context:DAT-908 labels:data_ingestion_logs
--comment: Initial changeset for data_ingestion_logs
--rollback: SELECT 1
DROP PROCEDURE IF EXISTS global.data_ingestion_logs(IN _log_code text, _target_table_sp text, _status text, _error_message text, _comments TEXT, _params JSONB);
CREATE OR REPLACE PROCEDURE global.data_ingestion_logs(
    IN _log_code text,
    IN _target_table_sp text,
    IN _status text,
    IN _error_message text,
    IN _comments text,
    IN _params jsonb
)
LANGUAGE plpgsql
AS $procedure$
DECLARE
    _worker text;
    _sql text;
BEGIN
    BEGIN
        _sql := '
            DO
            LANGUAGE plpgsql
            $$
                BEGIN
                    INSERT INTO global.data_ingestion_logs (
                        log_code, target_table_sp, status, error_message, comments, params
                    ) 
                    VALUES (
                        ' || quote_literal(_log_code) || ', 
                        ' || quote_literal(_target_table_sp) || ', 
                        ' || coalesce(quote_literal(_status), quote_literal('error')) || ',  
                        ' || coalesce(quote_literal(_error_message), quote_literal('')) || ',  
                        ' || coalesce(quote_literal(_comments), quote_literal('')) || ',  
                        ' || coalesce(quote_literal(_params::text), quote_literal('{}')) || '
                    );
                EXCEPTION
                    WHEN OTHERS THEN
                        RAISE NOTICE ''Error inserting into data_ingestion_logs: %'', SQLERRM;
                END;
            $$;';

		SELECT async_query INTO _worker FROM public.async_query(_sql);
		PERFORM public.async_query_status(_worker, 'cleanup');

    EXCEPTION
        WHEN OTHERS THEN
            RAISE NOTICE 'Error in async data_ingestion_logs: %', SQLERRM;
            BEGIN
				EXECUTE _sql;
			EXCEPTION
				WHEN OTHERS THEN
					RAISE NOTICE 'Error in sync data_ingestion_logs: %', SQLERRM;
			 END;
    END;
END
$procedure$;
