--liquibase formatted sql
--changeset liquibase:sync_store_stock_drilldown runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for sync_store_stock_drilldown
--rollback: SELECT 1
DROP PROCEDURE IF EXISTS public.sync_store_stock_drilldown(_is_historic bool );


CREATE OR REPLACE PROCEDURE public.sync_store_stock_drilldown(IN _is_historic boolean DEFAULT false)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
 	begin
	 	if _is_historic then 
	 		delete from 
	 		  inventory_smart.store_stock_drilldown 
	 		where 
	 		  true;
 		end if;
 		INSERT INTO inventory_smart.store_stock_drilldown (
		  article, product_code, store_code, 
		  date, channel, store_avail_oh, store_in_transit, 
		  oh_dc, oo, tot_inv, lw_qty, lw_revenue, 
		  lw_margin, promo_percentage, wos_predicted, 
		  store_level_prediction, size_integrity, 
		  style_color_status, store_status, 
		  excess, normal, shortfall, stockout, 
		  available_stores_percentage, week_to_date_sales, 
		  last_day_sales, top_25_percent, 
		  oo_dc, it_dc, si_it, si_dc, si_all, 
		  clearance, si_oo
		) 
		SELECT 
		  article, 
		  product_code, 
		  store_code, 
		  "date", 
		  channel, 
		  store_avail_oh, 
		  store_in_transit, 
		  oh_dc, 
		  oo, 
		  tot_inv, 
		  lw_qty, 
		  lw_revenue, 
		  lw_margin, 
		  promo_percentage, 
		  wos_predicted, 
		  store_level_prediction, 
		  size_integrity, 
		  style_color_status, 
		  store_status, 
		  excess, 
		  normal, 
		  shortfall, 
		  stockout, 
		  available_stores_percentage, 
		  week_to_date_sales, 
		  last_day_sales, 
		  top_25_percent, 
		  oo_dc, 
		  it_dc, 
		  si_it, 
		  si_dc, 
		  si_all, 
		  clearance , 
		  si_oo
		FROM 
		  public.store_stock_drilldown;
 	end
 $procedure$
;
