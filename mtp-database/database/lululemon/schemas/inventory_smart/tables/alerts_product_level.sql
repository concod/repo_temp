--liquibase formatted sql
--changeset shreyansh.jain@impactanalytics.co:alerts_product_level stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: Initial changeset for alerts_product_level

CREATE TABLE IF NOT EXISTS inventory_smart.alerts_product_level (
	l0_name varchar NULL,
	l1_name varchar NULL,
	l2_name varchar NULL,
	l3_name varchar NULL,
	l4_name varchar NULL,
	l5_name varchar NULL,
	l6_name varchar NULL,
	l7_name varchar NULL,
	l8_name varchar NULL,
	article varchar NULL,
	sell_through_perc float4 NULL,
	lw_sales_units int4 NULL,
	wtd_sales_units int4 NULL,
	dc_oh int4 NULL,
	oh_oo_it int4 NULL,
	in_stock_perc float4 NULL,
	wos_oh_oo_it float4 NULL,
	lw_margin_perc int4 NULL,
	lw_revenue int4 NULL,
	wos_oh float8 NULL,
	store_oh float8 NULL,
	store_oo float8 NULL,
	store_it float8 NULL,
	stockout float8 NULL,
	shortfall float8 NULL,
	excess float8 NULL,
	lw_promo float8 NULL,
	lw_aur float8 NULL,
	wtd_revenue float4 NULL,
	wtd_margin float4 NULL,
	wtd_promo float4 NULL,
	wtd_aur float4 NULL,
	dc_it int4 NULL,
	dc_oo int4 NULL,
	dc_oh_it_oo float4 NULL,
	wos_targeted float4 NULL,
	forecast_1week float4 NULL,
	forecast_4weeks float4 NULL,
	l4_weeks_units float4 NULL,
	l8_weeks_units float4 NULL,
	stockout_flag int4 NULL,
	shortfall_flag int4 NULL,
	stockout_is_resolved int4 NULL,
	shortfall_is_resolved int4 NULL,
	excess_flag text NULL,
	excess_is_resolved int4 NULL,
	article_orig varchar NULL,
	product_description varchar NULL,
	is_resolved int4 NULL,
	last_4_weeks_actuals int4 NULL,
	deviation_percentage float8 NULL,
	forecast_l4_weeks float8 NULL,
	clearance_product_alert_flag int4 NULL,
	clearance_product_is_resolved int4 NULL,
	excess_stock_alert_flag int4 NULL,
	excess_stock_is_resolved int4 NULL,
	forecast_deviation_is_resolved int4 NULL,
	forecast_deviation_alert_flag int4 NULL,
	new_product_alert_flag int4 NULL,
	new_product_is_resolved int4 NULL,
	forecast_error_perc_flag int4 NULL,
	forecast_error_perc_is_resolved int4 NULL,
	error_percentage float4 NULL,
	color_description varchar NULL,
	accuracy_perc float4 NULL,
	deviation_qty int4 NULL
);

--changeset aniruddh.singh@impactanalytics.co:alerts_product_level_add_launch_date stripComments:false splitStatements:false context:Release_1_0
--comment: Add launch_date column to alerts_product_level
ALTER TABLE inventory_smart.alerts_product_level
ADD COLUMN IF NOT EXISTS launch_date date;



--changeset raghav.kirkol@impactanalytics.co:alerts_product_level_add_channel stripComments:false splitStatements:false context:Release_1_0
--comment: Add channel column to alerts_product_level table
ALTER TABLE inventory_smart.alerts_product_level
ADD COLUMN IF NOT EXISTS channel varchar;


--changeset raghav.kirkol@impactanalytics.co:alerts_product_level_add_excess_stock_flag stripComments:false splitStatements:false context:Release_1_0
--comment: Add channel column to alerts_product_level_add_excess_stock_flag table
ALTER TABLE inventory_smart.alerts_product_level
ADD COLUMN IF NOT EXISTS excess_stock_flag int4;


--changeset raghav.kirkol@impactanalytics.co:alerts_product_level_add_s2_name stripComments:false splitStatements:false context:Release_1_0
--comment:add s2_name
ALTER TABLE inventory_smart.alerts_product_level
ADD COLUMN IF NOT EXISTS s2_name varchar;