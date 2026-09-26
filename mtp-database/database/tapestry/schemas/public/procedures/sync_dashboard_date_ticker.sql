--liquibase formatted sql
--changeset samarjit.mazumder@impactanalytics.co:sync_dashboard_date_ticker runOnChange:true stripComments:false splitStatements:false context:ASync_Procedures labels:briscoes_sync_dashboard_date_ticker
--comment: initial changeset for sync_dashboard_date_ticker
--rollback: SELECT 1

DROP PROCEDURE IF EXISTS public.sync_dashboard_date_ticker();

CREATE OR REPLACE PROCEDURE public.sync_dashboard_date_ticker()
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
DECLARE
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'public.sync_dashboard_date_ticker';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
    _cnt INT;
BEGIN
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
    SELECT COUNT(1) INTO _cnt FROM "global".default_attributes
    WHERE attribute_type = 'dashboard_date_ticker';

    IF _cnt = 0 THEN
        INSERT INTO "global".default_attributes(attribute_type, attribute_value, application_code)
        SELECT 
          'dashboard_date_ticker' AS attribute_type,
          TO_JSONB(a) AS attr,
          1 AS application_code
        FROM (
          SELECT TO_JSONB(b) AS value
          FROM public.dashboard_date_ticker b
        ) a;
    ELSE
        WITH cte AS (
          SELECT TO_JSONB(a) AS attr FROM (
            SELECT TO_JSONB(b) AS value
            FROM public.dashboard_date_ticker b
          ) a
        )     
        UPDATE "global".default_attributes 
        SET attribute_value = attr
        FROM cte
        WHERE attribute_type = 'dashboard_date_ticker';
    END IF;
		call global.data_ingestion_logs(_log_code, _sp_name, 'end', null, (clock_timestamp() - _st)::text, null);
	exception
		when others then
	        -- Log the error if an exception occurs during any part of the procedure
	        call global.data_ingestion_logs(_log_code, _sp_name, _log_step, SQLERRM, (clock_timestamp() - _st)::text, null);
            raise exception 'Error occurred in the procedure: %', SQLERRM;
	end;
END
$procedure$
;