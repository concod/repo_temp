--liquibase formatted sql
--changeset ujjawal.singh@impactanalytics.co:sync_dashboard_date_ticker runOnChange:true stripComments:false splitStatements:false context:ASync_Procedures labels:custom_sync_dashboard_date_ticker
--comment: remove the input for dashboard_date_ticker

DROP PROCEDURE IF EXISTS public.sync_dashboard_date_ticker();

CREATE OR REPLACE PROCEDURE public.sync_dashboard_date_ticker()
LANGUAGE plpgsql
AS $procedure$
DECLARE
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'public.sync_dashboard_date_ticker';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
    _public_date jsonb;
    _attribute_value jsonb;
    _updated_json text;
    _current_date date := current_date;
    _table_not_found boolean := false;
BEGIN
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
    BEGIN
        SELECT jsonb_build_object(
            'value',
            jsonb_build_object(
                'refresh_date', refresh_date,
                'transaction_date', transaction_date,
                'mfp_date', current_date
            )
        )
        INTO _public_date
        FROM public.dashboard_date_ticker;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Exception: source table public.dashboard_date_ticker not found or error occurred';
        _table_not_found := true;
    END;

    IF _table_not_found THEN
        SELECT attribute_value::jsonb INTO _attribute_value
        FROM global.default_attributes
        WHERE attribute_type = 'dashboard_date_ticker';

        RAISE NOTICE 'Fallback attribute_value from global.default_attributes: %', _attribute_value;

        IF _attribute_value IS NOT NULL THEN
            _updated_json := jsonb_build_object(
                'value',
                (
                    SELECT jsonb_object_agg(key, to_jsonb(_current_date))
                    FROM jsonb_each_text(_attribute_value)
                )
            )::text;
        ELSE
            _updated_json := jsonb_build_object(
                'value',
                jsonb_build_object(
                    'refresh_date', _current_date,
                    'transaction_date', _current_date,
                    'mfp_date', _current_date
                )
            )::text;
        END IF;

        RAISE NOTICE 'Constructed fallback JSON: %', _updated_json;

        UPDATE global.tenant_attribute_master
        SET attribute_value = _updated_json::jsonb
        WHERE name = 'dashboard_date_ticker';

        UPDATE global.default_attributes
        SET attribute_value = _updated_json::jsonb
        WHERE attribute_type = 'dashboard_date_ticker';

    ELSE
        RAISE NOTICE 'Updating with source table data: %', _public_date;

        UPDATE global.tenant_attribute_master
        SET attribute_value = _public_date::jsonb
        WHERE name = 'dashboard_date_ticker';

        UPDATE global.default_attributes
        SET attribute_value = _public_date::jsonb
        WHERE attribute_type = 'dashboard_date_ticker';
    END IF;
		call global.data_ingestion_logs(_log_code, _sp_name, 'end', null, (clock_timestamp() - _st)::text, null);
	exception
		when others then
	        -- Log the error if an exception occurs during any part of the procedure
	        call global.data_ingestion_logs(_log_code, _sp_name, _log_step, SQLERRM, (clock_timestamp() - _st)::text, null);
            raise exception 'Error occurred in the procedure: %', SQLERRM;
	end;
END;
$procedure$;