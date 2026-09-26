--liquibase formatted sql
--changeset swapnil.bhange:sync_dashboard_date_ticker_v2 stripComments:false splitStatements:false runOnChange:true context:Release_1_0 labels:liquibase_project_start
--comment: added check for public table for sync_dashboard_date_ticker_v2

DROP PROCEDURE IF EXISTS public.sync_dashboard_date_ticker(bool);
CREATE OR REPLACE PROCEDURE public.sync_dashboard_date_ticker(IN _is_historic boolean DEFAULT false)
 LANGUAGE plpgsql
AS $procedure$
declare 
_value jsonb;
_attribute_value jsonb;
_key text;
_value_date text;
_current_date date :=current_date;
_updated_json text;
_cntr integer:=0;
_query text;
-- Logging variables
_log_code varchar := gen_random_uuid();
_sp_name varchar := 'public.sync_dashboard_date_ticker';
_log_step varchar;
_st TIMESTAMP := clock_timestamp();
begin

	-- Start logging
	CALL global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	PERFORM set_config('local.log_code', _log_code, true);
	PERFORM set_config('local.sp_name', _sp_name, true);
        
        IF to_regclass('public.dashboard_date_ticker') IS NULL THEN
        RAISE NOTICE 'Table public.dashboard_date_ticker does not exist. Exiting procedure.';
        CALL global.data_ingestion_logs(_log_code, _sp_name, 'end - table missing dashboard_date_ticker', null, (clock_timestamp() - _st)::text, null);
        RETURN; -- exit the procedure completely
        END IF;

	BEGIN
		_log_step := 'Get dashboard_date_ticker attribute value';
		PERFORM set_config('local.log_step', _log_step, true);
		
        select attribute_value::jsonb into _attribute_value from global.tenant_attribute_master tam 
        where name ='dashboard_date_ticker';

		CALL global.data_ingestion_logs(_log_code, _sp_name, _log_step, null, (clock_timestamp() - _st)::text, null);

		_log_step := 'Process JSON values and build updated structure';
		PERFORM set_config('local.log_step', _log_step, true);
		
        for _value in (select value from jsonb_each_text(_attribute_value))
        loop
                for  _key in (select key from jsonb_each_text(_value))
                loop        
                        _cntr:=_cntr+1;
                        
                        _query:= 'select '||_key ||' from public.dashboard_date_ticker ;';
                        begin 
                        execute _query into _current_date;
                        
                        exception when others then
                                _updated_json := null;
                                --return;
                        end;
                        
                        raise notice '_current_date%',_current_date;
                
                        if _cntr = 1 then
                        _updated_json := '{"'||_key||'":"'||_current_date||'"' ;
                        else 
                                _updated_json := concat(_updated_json,  ',"'||_key||'":"'||_current_date||'"');
                        end if;        
                end loop;
        _updated_json :=concat(_updated_json,'}');
        end loop;
        _updated_json :='{"value":'||_updated_json||'}';
        raise notice '_updated_json%',_updated_json;

		CALL global.data_ingestion_logs(_log_code, _sp_name, _log_step, null, (clock_timestamp() - _st)::text, null);

		_log_step := 'Update tenant_attribute_master table';
		PERFORM set_config('local.log_step', _log_step, true);
		
        update global.tenant_attribute_master tam 
         set attribute_value = _updated_json::jsonb 
                where name ='dashboard_date_ticker';

		CALL global.data_ingestion_logs(_log_code, _sp_name, _log_step, null, (clock_timestamp() - _st)::text, null);

		_log_step := 'Update default_attributes table';
		PERFORM set_config('local.log_step', _log_step, true);
		
        with cte as (
 	select to_jsonb(a) as attr from (
 	                                SELECT to_jsonb(b) as value
 	                                FROM public.dashboard_date_ticker b) a)
 		
  	update "global".default_attributes 
  	set attribute_value = attr
  	from cte
  	where attribute_type ='dashboard_date_ticker';

		CALL global.data_ingestion_logs(_log_code, _sp_name, _log_step, null, (clock_timestamp() - _st)::text, null);

	EXCEPTION
		WHEN OTHERS THEN
	        -- Log the error if an exception occurs during any part of the procedure
	        CALL global.data_ingestion_logs(_log_code, _sp_name, _log_step, SQLERRM, (clock_timestamp() - _st)::text, null);
            RAISE EXCEPTION 'Error occurred in the procedure: %', SQLERRM;
	END;

	CALL global.data_ingestion_logs(_log_code, _sp_name, 'end', null, (clock_timestamp() - _st)::text, null);
        
end  $procedure$
;
