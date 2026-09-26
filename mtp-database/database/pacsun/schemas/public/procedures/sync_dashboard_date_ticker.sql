--liquibase formatted sql
--changeset sreevathsa.sp@impactanalytics.co:sync_dashboard_date_ticker_v1 runOnChange:true stripComments:false splitStatements:false context:ASync_Procedures labels:pacsun_sync_dashboard_date_ticker
--comment: initial changeset for sync_dashboard_date_ticker 

DROP PROCEDURE if exists public.sync_dashboard_date_ticker();

CREATE OR REPLACE PROCEDURE public.sync_dashboard_date_ticker(IN _is_historic boolean DEFAULT false)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
DECLARE
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'public.sync_dashboard_date_ticker';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
    _value jsonb; 
    _attribute_value jsonb;
    _key text;
    _value_date text;
    _current_date date := current_date;
    _updated_json text;
    _cntr integer := 0;
    _public_date jsonb;
    _table_not_found bool := false;
    _cnt INT;
BEGIN
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
    -- Get data from public.dashboard_date_ticker
    BEGIN
        SELECT jsonb_build_object('value', jsonb_build_object('refresh_date', refresh_date, 'transaction_date', transaction_date, 'mfp_date', current_date))
        INTO _public_date
        FROM public.dashboard_date_ticker;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'exception %', _table_not_found;
        _table_not_found = true;
    END;
    
    -- Check if dashboard_date_ticker exists in default_attributes
    SELECT COUNT(1) INTO _cnt FROM "global".default_attributes
    WHERE attribute_type = 'dashboard_date_ticker';
    
    IF _table_not_found = true THEN
        -- Original logic when table not found
        SELECT attribute_value::jsonb INTO _attribute_value FROM global.default_attributes da  
        WHERE attribute_type = 'dashboard_date_ticker';
        
        RAISE NOTICE '_attribute_value %', _attribute_value;
        
        FOR _value IN (SELECT value FROM jsonb_each_text(_attribute_value))
        LOOP
            FOR _key IN (SELECT key FROM jsonb_each_text(_value))
            LOOP    
                _cntr := _cntr + 1;
            
                IF _cntr = 1 THEN
                    _updated_json := '{"' || _key || '":"' || _current_date || '"';
                ELSE
                    _updated_json := concat(_updated_json, ',"' || _key || '":"' || _current_date || '"');
                END IF;    
            END LOOP;
            
            _updated_json := concat(_updated_json, '}');
        END LOOP;
        
        _updated_json := '{"value":' || _updated_json || '}';
        RAISE NOTICE '_updated_json %', _updated_json;
        
        UPDATE global.tenant_attribute_master tam
        SET attribute_value = _updated_json::jsonb
        WHERE name = 'dashboard_date_ticker';
        
        UPDATE global.default_attributes tam
        SET attribute_value = _updated_json::jsonb
        WHERE attribute_type = 'dashboard_date_ticker';
    ELSE 
        -- Table found, update with data from public.dashboard_date_ticker
        IF _cnt = 0 THEN
            -- Insert data if not exists in default_attributes
            INSERT INTO "global".default_attributes(attribute_type, attribute_value, application_code)
            SELECT 
                'dashboard_date_ticker' AS attribute_type,
                TO_JSONB(a) AS attribute_value,
                1 AS application_code
            FROM (
                SELECT TO_JSONB(b) AS value
                FROM public.dashboard_date_ticker b
            ) a;
            
            -- Also update tenant_attribute_master
            UPDATE global.tenant_attribute_master tam
            SET attribute_value = _public_date::jsonb
            WHERE name = 'dashboard_date_ticker';
        ELSE
            -- Update existing records in both tables
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
            
            UPDATE global.tenant_attribute_master tam
            SET attribute_value = _public_date::jsonb
            WHERE name = 'dashboard_date_ticker';
        END IF;
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