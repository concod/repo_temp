--liquibase formatted sql
--changeset anujkumar.singh@impactanalytics.co:sync_dc_forecast_week_level runOnChange:true stripComments:false splitStatements:false context:VS_inv_smart labels:MTP-59895
--comment: Initial Changeset 
--rollback: SELECT 1
DROP procedure IF EXISTS public.sync_dc_forecast_week_level();
CREATE OR REPLACE PROCEDURE public.sync_dc_forecast_week_level()
 LANGUAGE plpgsql
AS $procedure$
declare
		_worker text;
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'public.sync_dc_forecast_week_level';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
 	begin	 
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
 		select async_query into _worker from public.async_query('truncate inventory_smart.dc_forecast_week_level;');

    perform public.async_query_status(_worker, 'cleanup');
 		raise notice 'Step1: %', (clock_timestamp() - _st);

    perform public.parellel_insert('WITH rows AS (
		insert into inventory_smart.dc_forecast_week_level (
 		  article, product_code, fiscal_year_week, dc_code, dc_outbound, dc_inv_bop_pre_reserve,
			dc_inv_bop_post_allocation, sales_forecast,dc_inv_bop,safety_stock
 		) 
 		SELECT 
 		  article, product_code, fiscal_year_week, dc_code, dc_outbound, dc_inv_bop_pre_reserve, 
			dc_inv_bop_post_allocation, sales_forecast,dc_inv_bop,safety_stock
 		FROM (
 		  select
				paf.article, 
				a.product_code,
				a.fiscal_year_week,
				dc.dc_code,
				ROUND(a.store_allocation_unconstrained::numeric,2) AS dc_outbound,
				a.dc_inv_bop_pre_reserve,
				a.dc_inv_bop_post_allocation,
				ROUND(a.sales_forecast::numeric,2) AS sales_forecast,
                a.dc_inv_bop,
				a.safety_stock
				from public.dc_forecast_week_level a
				join "global".product_attributes_filter paf using(product_code) 
				join "global".distribution_centres dc on a.dc_code = dc.linked_store_code
			{where} 
			) x
		on conflict do nothing RETURNING 1
		) 
		SELECT 
		  count(1) as cnt 
		FROM 
		  rows;', 50, 'public.dc_forecast_week_level', 'product_code', 'dfwl_idx', 500);
 		raise notice 'Step2: %', (clock_timestamp() - _st);
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