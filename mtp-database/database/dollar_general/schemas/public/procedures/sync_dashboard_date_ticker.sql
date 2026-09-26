--liquibase formatted sql
--changeset swapnil.bhange:sync_dashboard_date_ticker runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:0051
--comment: added part to update default_attributes table for sync_dashboard_date_ticker
--rollback: SELECT 1
DROP PROCEDURE IF EXISTS public.sync_dashboard_date_ticker(bool);
CREATE OR REPLACE PROCEDURE public.sync_dashboard_date_ticker(IN _is_historic boolean DEFAULT false)
 LANGUAGE plpgsql
AS $procedure$
declare 
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'public.sync_dashboard_date_ticker';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
_value jsonb;
_attribute_value jsonb;
_key text;
_value_date text;
_current_date date :=current_date;
_updated_json text;
_cntr integer:=0;
_query text;
begin
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
        select attribute_value::jsonb into _attribute_value from global.tenant_attribute_master tam 
        where name ='dashboard_date_ticker';
        --raise notice 'dashboard_date_ticker%',_attribute_value;
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
        update global.tenant_attribute_master tam 
         set attribute_value = _updated_json::jsonb 
                where name ='dashboard_date_ticker';

        with cte as (
 	select to_jsonb(a) as attr from (
 	                                SELECT to_jsonb(b) as value
 	                                FROM public.dashboard_date_ticker b) a)
 		
  	update "global".default_attributes 
  	set attribute_value = attr
  	from cte
  	where attribute_type ='dashboard_date_ticker';
        
		call global.data_ingestion_logs(_log_code, _sp_name, 'end', null, (clock_timestamp() - _st)::text, null);
	exception
		when others then
	        -- Log the error if an exception occurs during any part of the procedure
	        call global.data_ingestion_logs(_log_code, _sp_name, _log_step, SQLERRM, (clock_timestamp() - _st)::text, null);
            raise exception 'Error occurred in the procedure: %', SQLERRM;
	end;
end
$procedure$
;