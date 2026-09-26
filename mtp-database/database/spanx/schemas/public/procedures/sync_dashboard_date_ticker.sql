--liquibase formatted sql
--changeset abhimanyu.sheoran@impactanalytics.co:sync_dashboard_date_ticker runOnChange:true stripComments:false splitStatements:false context:Release_1_1 
--comment: adding procedure for sync_dashboard_date_ticker

DROP PROCEDURE IF EXISTS public.sync_dashboard_date_ticker();

CREATE OR REPLACE PROCEDURE public.sync_dashboard_date_ticker()
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
declare
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'public.sync_dashboard_date_ticker';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
begin
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
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
