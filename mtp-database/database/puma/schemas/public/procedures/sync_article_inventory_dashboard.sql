--liquibase formatted sql
--changeset liquibase:sync_article_inventory_dashboard runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for sync_article_inventory_dashboard
--rollback: SELECT 1
DROP PROCEDURE IF EXISTS public.sync_article_inventory_dashboard(IN _is_historic boolean);
CREATE OR REPLACE PROCEDURE public.sync_article_inventory_dashboard(IN _is_historic boolean DEFAULT true)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
 	begin
	 	if _is_historic then 
	 		delete from 
	 		  inventory_smart.article_inventory_dashboard 
	 		where 
	 		  true;
 		end if;
 		insert into inventory_smart.article_inventory_dashboard (
		  article, store_code, channel, oh, it, 
		  oo, wos, lw_qty, lw_revenue, lw_margin, 
		  promo_percentage, excess, normal, 
		  shortfall, stockout, si_it, si_dc, 
		  si_all, si, oh_dc, store_level_prediction, 
		  tot_inv, available_stores_percentage, 
		  week_to_date_sales, oo_dc, it_dc, 
		  wos_predicted_oh_oo, wos_predicted_oh, 
		  clearance, si_oo
		) 
		SELECT 
		  article, 
		  store_code, 
		  channel, 
		  oh, 
		  it, 
		  oo, 
		  wos, 
		  lw_units, 
		  lw_revenue, 
		  lw_margin, 
		  promo_percentage, 
		  excess, 
		  normal, 
		  shortfall, 
		  stockout, 
		  si_it, 
		  si_dc, 
		  si_all, 
		  size_integrity si, 
		  oh_dc, 
		  store_level_prediction, 
		  tot_inv, 
		  available_stores_percentage, 
		  week_to_date_sales, 
		  oo_dc, 
		  it_dc, 
		  wos_predicted_oh_oo, 
		  wos_predicted_oh, 
		  clearance , 
		  si_oo
		FROM 
		  public.article_inventory_dashboard;
 	end
 $procedure$
;
