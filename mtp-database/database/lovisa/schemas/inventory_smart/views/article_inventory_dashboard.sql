--liquibase formatted sql
--changeset swapnil.bhange:article_inventory_dashboard_v5 runOnChange:true stripComments:false splitStatements:false context:zdt-views labels:MTP-5
--comment: initial changeset for article_inventory_dashboard_v5
--rollback: SELECT 1
do
$$
DECLARE 
	_is_view int;
	_is_table int;
begin

	select count(*) as cnt into _is_table
	from information_schema."tables" c  
	where table_name = 'article_inventory_dashboard' and table_schema = 'inventory_smart' 
	and table_type = 'BASE TABLE';

	select count(*) as cnt into _is_view
	from information_schema."tables" c  
	where table_name = 'article_inventory_dashboard' and table_schema = 'inventory_smart' 
	and table_type = 'VIEW';

	IF _is_table = 1 THEN 
	
		DROP TABLE IF EXISTS inventory_smart.article_inventory_dashboard;
		--raise notice 'dropping table....';
		
	END IF;
	
	IF _is_view = 1 THEN 
	
		DROP VIEW IF EXISTS inventory_smart.article_inventory_dashboard;
		--raise notice 'dropping view....';
		
	END IF;
	
CREATE OR REPLACE VIEW inventory_smart.article_inventory_dashboard
AS SELECT article_inventory_dashboard_version.version_code,
    article_inventory_dashboard_version.article,
    article_inventory_dashboard_version.store_code,
    article_inventory_dashboard_version.l0_name,
    article_inventory_dashboard_version.l1_name,
    article_inventory_dashboard_version.l2_name,
    article_inventory_dashboard_version.l3_name,
    article_inventory_dashboard_version.l4_name,
    article_inventory_dashboard_version.channel,
    article_inventory_dashboard_version.product_description,
    article_inventory_dashboard_version.oh,
    article_inventory_dashboard_version.it,
    article_inventory_dashboard_version.oo,
    article_inventory_dashboard_version.total_inv,
    article_inventory_dashboard_version.last_week_sales,
    article_inventory_dashboard_version.last_week_revenue,
    article_inventory_dashboard_version.lw_margin,
    article_inventory_dashboard_version.promo_percentage,
    article_inventory_dashboard_version.dos,
    article_inventory_dashboard_version.dos_oh,
    article_inventory_dashboard_version.dos_oh_it,
    article_inventory_dashboard_version.dc_oh_oo_it_dos,
    article_inventory_dashboard_version.dc_oh_dos,
    article_inventory_dashboard_version.dc_oh_oo_dos,
    article_inventory_dashboard_version.store_level_prediction,
    article_inventory_dashboard_version.size_integrity,
    article_inventory_dashboard_version.size_integrity_oh_it,
    article_inventory_dashboard_version.size_integrity_oh_oo_it,
    article_inventory_dashboard_version.excess,
    article_inventory_dashboard_version.normal,
    article_inventory_dashboard_version.shortfall,
    article_inventory_dashboard_version.stockout,
    article_inventory_dashboard_version.available_stores_percentage,
    article_inventory_dashboard_version.week_to_date_sales,
    article_inventory_dashboard_version.last_day_sales,
    article_inventory_dashboard_version.oh_dc,
    article_inventory_dashboard_version.oo_dc,
    article_inventory_dashboard_version.dc_oo_po,
    article_inventory_dashboard_version.it_dc,
    article_inventory_dashboard_version.sales_1_ago,
    article_inventory_dashboard_version.sales_2_ago,
    article_inventory_dashboard_version.sales_3_ago,
    article_inventory_dashboard_version.sales_4_ago,
    article_inventory_dashboard_version.aur,
    article_inventory_dashboard_version.sell_through_rate,
    article_inventory_dashboard_version.style_color_status,
    article_inventory_dashboard_version.product_type,
    article_inventory_dashboard_version.in_stock_count,
    article_inventory_dashboard_version.total_count,
    article_inventory_dashboard_version.last_allcated,
    article_inventory_dashboard_version.display_article,
    article_inventory_dashboard_version.forecast_1_ago,
    article_inventory_dashboard_version.forecast_2_ago,
    article_inventory_dashboard_version.forecast_3_ago,
    article_inventory_dashboard_version.forecast_4_ago,
    article_inventory_dashboard_version.style_name,
    article_inventory_dashboard_version.range_name,
    article_inventory_dashboard_version.special_classification,
    article_inventory_dashboard_version.l4w_units,
    article_inventory_dashboard_version.store_name,
    article_inventory_dashboard_version.wip,
    article_inventory_dashboard_version.average_discount,
    article_inventory_dashboard_version.sales_5_ago,
    article_inventory_dashboard_version.sales_6_ago,
    article_inventory_dashboard_version.sales_7_ago,
    article_inventory_dashboard_version.sales_8_ago,
    article_inventory_dashboard_version.grade,
    article_inventory_dashboard_version.price,
    article_inventory_dashboard_version.lw_margin_percentage,
    article_inventory_dashboard_version.tdos,
    article_inventory_dashboard_version.launch_date,
    article_inventory_dashboard_version.s1_name,
    article_inventory_dashboard_version.s0_name,
        CASE
    WHEN article_inventory_dashboard_version.stockout <> 0 THEN 'stockout'
    WHEN article_inventory_dashboard_version.shortfall <> 0 THEN 'shortfall'
    WHEN article_inventory_dashboard_version.excess <> 0 THEN 'excess'
    WHEN article_inventory_dashboard_version.normal <> 0 THEN 'normal'
    ELSE NULL
END AS product_tag
   FROM inventory_smart.article_inventory_dashboard_version
  WHERE article_inventory_dashboard_version.version_code = global.get_table_version('inventory_smart.article_inventory_dashboard_version'::text);


end;
$$;
