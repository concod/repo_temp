--liquibase formatted sql
--changeset suryasai.gopal@impactanalytics.co:sync_article_inventory_dashboard runOnChange:true stripComments:false splitStatements:false context:MTP-15174 labels:added columns 
--comment: added KPI related columns 
--rollback: SELECT 1
DROP PROCEDURE IF EXISTS public.sync_article_inventory_dashboard();
CREATE OR REPLACE PROCEDURE public.sync_article_inventory_dashboard()
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
 	begin
 		delete from 
 		  inventory_smart.article_inventory_dashboard
 		where 
 		  true;
 		insert into inventory_smart.article_inventory_dashboard (
 		    article,
 			store_code,
 			lw_revenue,
 			lw_margin,
 			oh,
 			oo,
 			it,
 			store_level_prediction,
 			oh_dc,
 			shortfall,
 			normal,
 			excess,
 			wos,
 			wos_predicted_oh_it,
			wos_predicted_oh,
 			lw_qty,
 			promo_percentage,
 			stockout,
 			tot_inv,
 			si,
 			available_stores_percentage,
 			week_to_date_sales,
			week_to_date_sales_revenue,
 			last_day_sales,
			last_day_sales_revenue,
 			top_25_percent,
 			oo_dc,
 			it_dc,
 			channel,
 			dc_oh_1,
 			dc_oh_qcloc,
 			dc_oh_cwc,
 			dc_oh_10,
 			sales_1_ago,
			sales_revenue_1_ago,
 			sales_2_ago,
			sales_revenue_2_ago,
 			sales_3_ago,
			sales_revenue_3_ago,
 			sales_4_ago,
			sales_revenue_4_ago,
 			available_to_allocate
 		) 
 		SELECT 
 		   article,
 			store_code,
 			lw_revenue,
 			lw_margin,
 			oh,
 			oo,
 			it,
 			store_level_prediction,
 			oh_dc,
 			shortfall,
 			normal,
 			excess,
 			wos,
 			wos_predicted_oh_it,
 			wos_predicted_oh,
 			lw_units,
 			promo_percentage,
 			stockout,
 			tot_inv,
 			size_integrity,
 			available_stores_percentage,
 			week_to_date_sales,
			week_to_date_sales_revenue,
 			last_day_sales,
			last_day_sales_revenue,
 			top_25_percent,
 			oo_dc,
 			it_dc,
 			channel,
 			dc_oh_1,
 			"dc_oh_QCLOC" as dc_oh_qcloc,
 			"dc_oh_CWC" as dc_oh_cwc,
 			dc_oh_10,
 			sales_1_ago,
			sales_revenue_1_ago,
 			sales_2_ago,
			sales_revenue_2_ago,
 			sales_3_ago,
			sales_revenue_3_ago,
 			sales_4_ago,
			sales_revenue_4_ago,
 			available_to_allocate
 		FROM 
 		  public.article_inventory_dashboard;
 	end
 $procedure$
;
