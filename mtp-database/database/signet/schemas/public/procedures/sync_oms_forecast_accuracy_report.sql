--liquibase formatted sql
--changeset liquibase:sync_oms_forecast_accuracy_report runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for sync_oms_forecast_accuracy_report
--rollback: SELECT 1


DROP PROCEDURE IF EXISTS sync_oms_forecast_accuracy_report(IN _is_historic boolean);
CREATE OR REPLACE PROCEDURE public.sync_oms_forecast_accuracy_report(IN _is_historic boolean DEFAULT false)
LANGUAGE plpgsql
AS $procedure$
declare
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'public.sync_oms_forecast_accuracy_report';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
BEGIN
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
	if _is_historic then 
            delete from 
              inventory_smart.oms_forecast_accuracy_report 
            where 
              true;
        end if;
   insert into inventory_smart.oms_forecast_accuracy_report
       (   	product_code,
		   	fiscal_year_week ,
			ia_fcst ,
			adj_fcst ,
			sales ,
			ia_vs_act ,
			adj_vs_act ,
			ia_vs_act_abs ,
			adj_vs_act_abs ,
			net_perc_ia_vs_act ,
			net_perc_adj_vs_act ,
			abs_perc_ia_vs_act ,
			abs_perc_adj_vs_act ,
			start_week_date
        )
   select
   	product_code,
    fiscal_year_week ,
	ia_fcst ,
	adj_fcst ,
	sales ,
	ia_vs_act ,
	adj_vs_act ,
	ia_vs_act_abs ,
	adj_vs_act_abs ,
	net_perc_ia_vs_act ,
	net_perc_adj_vs_act ,
	abs_perc_ia_vs_act ,
	abs_perc_adj_vs_act ,
	start_week_date
   from
     
     public.oms_forecast_accuracy_report;
  
		call global.data_ingestion_logs(_log_code, _sp_name, 'end', null, (clock_timestamp() - _st)::text, null);
	exception
		when others then
	        -- Log the error if an exception occurs during any part of the procedure
	        call global.data_ingestion_logs(_log_code, _sp_name, _log_step, SQLERRM, (clock_timestamp() - _st)::text, null);
            raise exception 'Error occurred in the procedure: %', SQLERRM;
	end;
 end;
$procedure$
;
;