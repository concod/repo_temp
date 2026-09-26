--liquibase formatted sql
--changeset ashish@impactanalytics.co:sync_instock_report runOnChange:true stripComments:false splitStatements:false context:Inv_Reporting labels:DAT-640
--comment: initial changeset for sync_instock_report
--rollback: SELECT 1
DROP PROCEDURE IF EXISTS public.sync_instock_report();
DROP PROCEDURE IF EXISTS public.sync_instock_report(IN _is_historic boolean);
CREATE OR REPLACE PROCEDURE public.sync_instock_report(IN _is_historic boolean DEFAULT false)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
declare
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'public.sync_instock_report';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
begin
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
 	call global.build_list_partitions('instock_report');
	if _is_historic then 
		delete from 
		  inventory_smart.instock_report 
		where 
		  true;
		perform global.create_drop_index_list_ingestion('inventory_smart', 'instock_report', true);
	end if;
 	INSERT INTO inventory_smart.instock_report (
 	  fiscal_year_week, store_code, product_code, 
 	  dc_to_store_replenishment, instock_exclusion_list, 
 	  combined_inclusion, min, max, model_stock, 
 	  oh, it, adjusted_forecast_qty, sales_units, 
 	  adjusted_error, instock_oh_count, 
 	  instock_oh_percentage, instock_oh_count_ly, 
 	  instock_oh_percentage_ly, instock_oh_it_count, 
 	  instock_oh_it_percentage, instock_oh_it_count_ly, 
 	  instock_oh_it_percentage_ly
 	) 
 	select 
 	  fiscal_year_week, 
 	  store_code, 
 	  product_code, 
 	  dc_to_store_replenishment, 
 	  instock_exclusion_list, 
 	  combined_inclusion, 
 	  min, 
 	  max, 
 	  model_stock, 
 	  oh, 
 	  it, 
 	  adjusted_forecast_qty, 
 	  sales_units, 
 	  adjusted_error, 
 	  instock_oh_count, 
 	  instock_oh_percentage, 
 	  instock_oh_count_ly, 
 	  instock_oh_percentage_ly, 
 	  instock_oh_it_count, 
 	  instock_oh_it_percentage, 
 	  instock_oh_it_count_ly, 
 	  instock_oh_it_percentage_ly 
 	FROM 
 	  public.instock_report dt 
-- 	  join global.store_master sm using(store_code) 
-- 	  join global.product_master pm using(product_code)
 	  on conflict(
 	    fiscal_year_week, store_code, product_code
 	  ) do 
 	update 
 	set 
 	  dc_to_store_replenishment = excluded.dc_to_store_replenishment, 
 	  instock_exclusion_list = excluded.instock_exclusion_list, 
 	  combined_inclusion = excluded.combined_inclusion, 
 	  min = excluded.min, 
 	  max = excluded.max, 
 	  model_stock = excluded.model_stock, 
 	  oh = excluded.oh, 
 	  it = excluded.it, 
 	  adjusted_forecast_qty = excluded.adjusted_forecast_qty, 
 	  sales_units = excluded.sales_units, 
 	  adjusted_error = excluded.adjusted_error, 
 	  instock_oh_count = excluded.instock_oh_count, 
 	  instock_oh_percentage = excluded.instock_oh_percentage, 
 	  instock_oh_count_ly = excluded.instock_oh_count_ly, 
 	  instock_oh_percentage_ly = excluded.instock_oh_percentage_ly, 
 	  instock_oh_it_count = excluded.instock_oh_it_count, 
 	  instock_oh_it_percentage = excluded.instock_oh_it_percentage, 
 	  instock_oh_it_count_ly = excluded.instock_oh_it_count_ly, 
 	  instock_oh_it_percentage_ly = excluded.instock_oh_it_percentage_ly;
 	if _is_historic then 
		perform global.create_drop_index_list_ingestion('inventory_smart', 'instock_report', false);
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
