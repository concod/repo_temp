--liquibase formatted sql
--changeset kamuju.mahaveer:sync_dashboard_date_ticker_v1 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:
--comment: initial changeset for sync_dashboard_date_ticker
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
 _public_date jsonb;
 _table_not_found bool:= false;
 begin
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
     
     begin
          SELECT jsonb_build_object('value', jsonb_build_object('refresh_date',current_date,'transaction_date',transaction_date,'mfp_date',mfp_date,'inventory_date',refresh_date))
          into _public_date
         FROM public.dashboard_date_ticker;
     exception when others then
         raise notice 'exception%', _table_not_found;
         _table_not_found = true;
     end;    
     if _table_not_found = true then
      select attribute_value::jsonb into _attribute_value from global.default_attributes da  
      where attribute_type ='dashboard_date_ticker';
      raise notice '_attribute_value%',_attribute_value;
      for _value in (select value from jsonb_each_text(_attribute_value))
      loop
          for  _key in (select key from jsonb_each_text(_value))
          loop    
              _cntr:=_cntr+1;
          
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
      update global.default_attributes  tam
       set attribute_value = _updated_json::jsonb
      where attribute_type ='dashboard_date_ticker';
   else 
       update global.tenant_attribute_master tam
       set attribute_value = _public_date::jsonb
      where name ='dashboard_date_ticker';
      update global.default_attributes  tam
       set attribute_value = _public_date::jsonb
      where attribute_type ='dashboard_date_ticker';
   end if;
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