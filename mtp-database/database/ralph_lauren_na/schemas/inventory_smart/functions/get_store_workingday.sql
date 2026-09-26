--liquibase formatted sql
--changeset liquibase:get_store_workingday runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for get_store_workingday
--rollback: SELECT 1
DROP FUNCTION IF EXISTS inventory_smart.get_store_workingday(store_code text, delivery_dt date, intervl integer, character varying);
CREATE OR REPLACE FUNCTION inventory_smart.get_store_workingday(store_code text, delivery_dt date, intervl integer, character varying)
 RETURNS date
 LANGUAGE plpgsql
AS $function$
declare
  _flag bool:=false;
  _query text;
  _date_array date[];
  _working_day date:=delivery_dt-concat(intervl::char,' day')::interval;
  _oprn text:=$3;
begin
   _query:='select array_agg(holiday_date) as date_arr from inventory_smart.store_holiday_calendar where store_code='''||store_code||'''';
	--raise notice 'Query : %',_query;
	execute _query into _date_array ;
	--raise notice 'Data : %',_date_array;
   loop
		if  ARRAY[_working_day]::date[] <@ _date_array then 
			if _oprn ='add'::text then
			_working_day :=_working_day+interval'1 day';
			else
			_working_day :=_working_day-interval'1 day';
			end if;
		else 
			_flag:=true;
		end if;
		exit when _flag;
   end loop;
   return _working_day;
end;
$function$
;