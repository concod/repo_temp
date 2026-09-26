--liquibase formatted sql
--changeset liquibase:sync_store_stock_drilldown runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for sync_store_stock_drilldown
--rollback: SELECT 1
DROP PROCEDURE IF EXISTS public.sync_store_stock_drilldown();
CREATE OR REPLACE PROCEDURE public.sync_store_stock_drilldown()
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
	begin
		delete from 
		  inventory_smart.store_stock_drilldown;
		INSERT INTO inventory_smart.store_stock_drilldown (
		  store_avail_oh,
		store_in_transit,
		oh_dc,
		article,
		product_code,
		store_code,
		channel,
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
		week_to_date_sales_revenue,
		last_day_sales,
		last_day_sales_revenue,
		top_25_percent,
		oo_dc,
		it_dc,
		date,
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
		  store_avail_oh,
		store_in_transit,
		oh_dc,
		article,
		product_code,
		store_code,
		channel,
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
		week_to_date_sales_revenue,
		last_day_sales,
		last_day_sales_revenue,
		top_25_percent,
		oo_dc,
		it_dc,
		date,
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
		  public.store_stock_drilldown;
	end
$procedure$
;
