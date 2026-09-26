--liquibase formatted sql
--changeset saumya.agnihotri:sync_article_inventory_dashboard_column_renaming runOnChange:true stripComments:false splitStatements:false context:SMA changes labels:MTP-22985
--comment: reserve columns added to the article inventory dashboard
--rollback: SELECT 1
DROP PROCEDURE IF EXISTS public.sync_article_inventory_dashboard();
CREATE OR REPLACE PROCEDURE public.sync_article_inventory_dashboard()
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
declare
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'public.sync_article_inventory_dashboard';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
begin
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
 		delete from 
 		  inventory_smart.article_inventory_dashboard
 		where 
 		  true;
 		insert into inventory_smart.article_inventory_dashboard (
 		  article, store_code, bulk_remaining, 
 		  oh, it, oo, wos, lw_qty, lw_revenue, 
 		  lw_margin, promo_percentage, price_point, 
 		  excess, normal, shortfall, stockout,
 		  model_stock, lw_margin_percentage, 
 		  user_reserve,system_reserve,sma_ecomm_reserve,
 		  dc_ecomm_reserve,ecomm_reserve
 		) 
 		SELECT 
 		  product_code, 
 		  store_code, 
 		  bulk_remaining, 
 		  oh, 
 		  it, 
 		  oo, 
 		  wos, 
 		  lw_units, 
 		  lw_revenue, 
 		  lw_margin, 
 		  promo_percentage, 
 		  price_point, 
 		  excess, 
 		  normal, 
 		  shortfall, 
 		  stockout,
 		  model_stock, 
 		  lw_margin_percentage,
 		  user_reserve,
 		  system_reserve,
 		  sma_ecomm_reserve,
 		  dc_ecomm_reserve,
 		  ecomm_reserve
 		FROM 
 		  public.article_inventory_dashboard;
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
