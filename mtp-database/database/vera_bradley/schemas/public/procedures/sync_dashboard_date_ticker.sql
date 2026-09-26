--liquibase formatted sql
--changeset liquibase:sync_dashboard_date_ticker runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for sync_dashboard_date_ticker
--rollback: SELECT 1
DROP PROCEDURE IF EXISTS public.sync_dashboard_date_ticker();
CREATE OR REPLACE PROCEDURE public.sync_dashboard_date_ticker()
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
declare 
_value jsonb;
_attribute_value jsonb;
_key text;
_value_date text;
_current_date date :=current_date;
_updated_json text;
_cntr integer:=0;
begin
	select attribute_value::jsonb into _attribute_value from global.tenant_attribute_master tam 
	where name ='dashboard_date_ticker';
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
end  $procedure$
;