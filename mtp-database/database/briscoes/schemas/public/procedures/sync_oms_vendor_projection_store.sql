--liquibase formatted sql
--changeset kanishka.parashar@impactanalytics.co:sync_oms_vendor_projection_store runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:sync_oms_vendor_projection_store
--comment: initial changeset for sync_oms_vendor_projection_store
--rollback: SELECT 1

DROP PROCEDURE IF EXISTS public.sync_oms_vendor_projection_store();

CREATE OR REPLACE PROCEDURE public.sync_oms_vendor_projection_store()
 LANGUAGE plpgsql
AS $procedure$
DECLARE
	_worker text;
	_sql TEXT ;
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'public.sync_oms_vendor_projection_store';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
BEGIN 
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
	SELECT async_query INTO _worker from public.async_query('truncate inventory_smart.oms_vendor_projection_store;'); 
	PERFORM public.async_query_status(_worker, 'cleanup');
	RAISE NOTICE 'Step1: %', (clock_timestamp() - _st);
	_st := clock_timestamp();
	_sql := ' WITH rows AS (
				insert into inventory_smart.oms_vendor_projection_store(
					article,
					size,
					product_code,
					vendor_name,
					vendor_code,
					store_code,
					channel,
					fiscal_year_month,
					fiscal_month_name,
					fiscal_year,
					store_forecast_pred,
					store_forecast_pred_cost,
					store_forecast_pred_constrained,
					store_forecast_pred_constrained_cost,
					store_forecast_pred_unconstrained,
					store_forecast_pred_unconstrained_cost,
					order_quantity,
					order_quantity_cost,
					raw_roq,
					raw_roq_cost,
					roq_constrained,
					roq_constrained_cost
			   )
			  select       
					article,
					size,
					product_code,
					vendor_name,
					vendor_code,
					store_code,
					channel,
					fiscal_year_month,
					fiscal_month_name,
					fiscal_year,
					store_forecast_pred,
					store_forecast_pred_cost,
					store_forecast_pred_constrained,
					store_forecast_pred_constrained_cost,
					store_forecast_pred_unconstrained,
					store_forecast_pred_unconstrained_cost,
					order_quantity,
					order_quantity_cost,
					raw_roq,
					raw_roq_cost,
					roq_constrained,
					roq_constrained_cost
			  	from
			    public.oms_vendor_projection_store {where} on conflict ON CONSTRAINT pk_oms_vendor_projection_store do nothing RETURNING 1
			) SELECT count(1) as cnt FROM rows; ';
	PERFORM public.parellel_insert(_sql,50, 'public.oms_vendor_projection_store ', 'product_code', 'ovp_idx', 500);
	RAISE NOTICE 'Step2: %', (clock_timestamp() - _st);
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
