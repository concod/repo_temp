-- liquibase formatted sql
-- changeset aiyush.prasad@impactanalytics.co:alerts_product_level stripComments:false splitStatements:false context: db_sync labels:alerts_product_level
-- comment: initial changeset for alerts_product_level
CREATE TABLE  inventory_smart.alerts_product_level (
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
	assortment_indicator varchar NULL,
	factory_type varchar NULL,
	intro_date date NULL,
	lms_attributes varchar NULL,
	lms_attribute_value varchar NULL,
	sell_through_perc float4 NULL,
	lw_sales_units int4 NULL,
	wtd_sales_units int4 NULL,
	dc_oh int4 NULL,
	store_oh_it_oo int4 NULL,
	in_stock_perc float4 NULL,
	wos_oh_oo_it float4 NULL,
	last_8_week_sales int4 NULL,
	lw_margin_perc int4 NULL,
	lw_revenue int4 NULL,
	wos_oh float8 NULL,
	wos_oh_it float8 NULL,
	wos_oh_oo float8 NULL,
	store_oh float8 NULL,
	store_oo float8 NULL,
	store_it float8 NULL,
	store_oh_it float8 NULL,
	stockout float8 NULL,
	shortfall float8 NULL,
	excess float8 NULL,
	normal float8 NULL,
	lw_promo float8 NULL,
	lw_aur float8 NULL,
	wtd_revenue float4 NULL,
	wtd_margin float4 NULL,
	wtd_promo float4 NULL,
	wtd_aur float4 NULL,
	last_allocated_date varchar NULL,
	store_groups _int4 NULL,
	dc_oh_it_oo_can int4 NULL,
	dc_it int4 NULL,
	dc_oo int4 NULL,
	styleid varchar NULL,
	lw_aur_can float4 NULL,
	lw_margin_perc_can float4 NULL,
	lw_promo_can float4 NULL,
	lw_revenue_can float4 NULL,
	lw_sales_units_can float4 NULL,
	wtd_aur_can float4 NULL,
	wtd_margin_can float4 NULL,
	wtd_promo_can float4 NULL,
	wtd_revenue_can float4 NULL,
	wtd_sales_units_can float4 NULL,
	dc_it_can float4 NULL,
	dc_oh_can float4 NULL,
	dc_oh_it_oo float4 NULL,
	dc_oo_can float4 NULL,
	dc_it_us float4 NULL,
	dc_oh_us float4 NULL,
	dc_oh_it_oo_us float4 NULL,
	dc_oo_us float4 NULL,
	lw_aur_us float4 NULL,
	lw_margin_perc_us float4 NULL,
	lw_promo_us float4 NULL,
	lw_revenue_us float4 NULL,
	lw_sales_units_us float4 NULL,
	wtd_aur_us float4 NULL,
	wtd_margin_us float4 NULL,
	wtd_promo_us float4 NULL,
	wtd_revenue_us float4 NULL,
	wtd_sales_units_us float4 NULL,
	wos_targeted float4 NULL,
	article_status_tag varchar NULL,
	forecast_1week float4 NULL,
	forecast_4weeks float4 NULL,
	l4_weeks_units float4 NULL,
	forecast_8weeks float4 NULL,
	l8_weeks_units float4 NULL,
	stockout_flag int4 NULL,
	shortfall_flag int4 NULL,
	stockout_is_resolved int4 NULL,
	shortfall_is_resolved int4 NULL,
	normal_flag text NULL,
	normal_is_resolved int4 NULL,
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
	excess_stock_is_resolved int4 NULL
);

--changeset aiyush.prasad@impactanalytics.co:alerts_product_level_v1 stripComments:false splitStatements:false context: product_group column addition labels:added product_group 
--comment: added product_group
ALTER TABLE inventory_smart.alerts_product_level ADD   product_group _varchar NULL;

--changeset aiyush.prasad@impactanalytics.co:alerts_product_level_change stripComments:false splitStatements:false context: forecast_deviation_is_resolved column addition labels:add forecast_deviation_is_resolved  
--comment: add forecast_deviation_is_resolved
ALTER TABLE inventory_smart.alerts_product_level ADD   forecast_deviation_is_resolved int4 NULL;

--changeset aiyush.prasad@impactanalytics.co:alerts_product_level_change_v2 stripComments:false splitStatements:false context: forecast_deviation_alert_flag column addition labels:add forecast_deviation_alert_flag  
--comment: add forecast_deviation_alert_flag
ALTER TABLE inventory_smart.alerts_product_level ADD   forecast_deviation_alert_flag int4 NULL;

--changeset aiyush.prasad@impactanalytics.co:alerts_product_level_change_new01 stripComments:false splitStatements:false context: alert_flag column addition labels:add alert_flag  
--comment: add alert flags
ALTER TABLE inventory_smart.alerts_product_level ADD   new_product_alert_flag int4 NULL;
ALTER TABLE inventory_smart.alerts_product_level ADD   new_product_is_resolved int4 NULL;

--changeset aiyush.prasad@impactanalytics.co:alerts_product_level_change_v401 stripComments:false splitStatements:false context: forecast_alert_flag column addition labels:add alert_flag  
--comment: add forecast alert flags
ALTER TABLE inventory_smart.alerts_product_level ADD   forecast_error_perc_flag int4 NULL;
ALTER TABLE inventory_smart.alerts_product_level ADD   forecast_error_perc_is_resolved int4 NULL;
ALTER TABLE inventory_smart.alerts_product_level ADD   error_percentage float4 NULL;

--changeset aiyush.prasad@impactanalytics.co:alerts_product_level_change_v502 stripComments:false splitStatements:false context: color_description column addition labels:add color_description  
--comment: add color_description
ALTER TABLE inventory_smart.alerts_product_level ADD   color_description varchar NULL;

--changeset aiyush.prasad@impactanalytics.co:alerts_product_level_change_v604 stripComments:false splitStatements:false context: accuracy_perc column addition labels:add accuracy_perc  
--comment: add accuracy_perc
ALTER TABLE inventory_smart.alerts_product_level ADD   accuracy_perc float4 NULL;

--changeset aiyush.prasad@impactanalytics.co:alerts_product_level_change_v705 stripComments:false splitStatements:false context: recently_launched column addition labels:add recently_launched  
--comment: add accuracy_perc
ALTER TABLE inventory_smart.alerts_product_level ADD   recently_lanched_products int2 NULL;
ALTER TABLE inventory_smart.alerts_product_level ADD   recently_lanched_products_is_resolved int2 NULL;

--changeset aiyush.prasad@impactanalytics.co:alerts_product_level_change_v8 stripComments:false splitStatements:false context: launch_date column addition labels:add launch_date  
--comment: add launch_date
ALTER TABLE inventory_smart.alerts_product_level ADD   launch_date date NULL;

--changeset aiyush.prasad@impactanalytics.co:alerts_product_level_change_v9 stripComments:false splitStatements:false context: store_group column addition labels:add store_group  
--comment: add store_group
ALTER TABLE inventory_smart.alerts_product_level RENAME COLUMN store_groups TO store_group;
ALTER TABLE inventory_smart.alerts_product_level ALTER COLUMN store_group TYPE varchar;
ALTER TABLE inventory_smart.alerts_product_level ADD COLUMN deviation_qty int4;


--changeset hemantkumar.bajaj@impactanalytics.co:alerts_product_level_change_v10 stripComments:false splitStatements:false context:  
--comment: add inseason_alert_accuracy_flag,inseason_alert_deviation_flag,new_accuracy_flag

ALTER TABLE inventory_smart.alerts_product_level 
ADD COLUMN inseason_alert_accuracy_flag INT4 NULL;

ALTER TABLE inventory_smart.alerts_product_level 
ADD COLUMN inseason_alert_deviation_flag INT4 NULL;

ALTER TABLE inventory_smart.alerts_product_level 
ADD COLUMN new_accuracy_flag INT4 NULL;

ALTER TABLE inventory_smart.alerts_product_level 
ADD COLUMN inseason_alert_accuracy_flag_resolved INT4 NULL;

ALTER TABLE inventory_smart.alerts_product_level 
ADD COLUMN inseason_alert_deviation_flag_resolved INT4 NULL;

ALTER TABLE inventory_smart.alerts_product_level 
ADD COLUMN new_accuracy_flag_resolved INT4 NULL;

--changeset rajesh.draksharapu@impactanalytics.co:alerts_product_level_po_and_reynosa_flags addition stripComments:false splitStatements:false context:
--comment: add Open Contract PO / About to Expire Contract PO / Reynosa DC alert flags + resolved flags to inventory_smart.alerts_product_level

ALTER TABLE inventory_smart.alerts_product_level
ADD COLUMN open_contract_po_flag INT4 NULL;

ALTER TABLE inventory_smart.alerts_product_level
ADD COLUMN about_to_expire_contract_po_flag INT4 NULL;

ALTER TABLE inventory_smart.alerts_product_level
ADD COLUMN reynosa_dc_alert_flag INT4 NULL;

ALTER TABLE inventory_smart.alerts_product_level
ADD COLUMN reynosa_dc_alert_resolved INT4 NULL;

ALTER TABLE inventory_smart.alerts_product_level
ADD COLUMN open_contract_po_flag_resolved INT4 NULL;

ALTER TABLE inventory_smart.alerts_product_level
ADD COLUMN about_to_expire_contract_po_flag_resolved INT4 NULL;

--changeset hemantkumar.bajaj@impactanalytics.co:alerts_product_level stripComments:false splitStatements:false context:
--comment:adding_product_vertical_column

ALTER TABLE inventory_smart.alerts_product_level ADD   product_vertical varchar NULL;
ALTER TABLE inventory_smart.alerts_product_level ADD   product_vertical_desc varchar NULL;


--changeset hemantkumar.bajaj@impactanalytics.co:alerts_product_level_v2 stripComments:false splitStatements:false context:
--comment:adding_product_reach and product_reach_desc

ALTER TABLE inventory_smart.alerts_product_level ADD   product_reach varchar NULL;
ALTER TABLE inventory_smart.alerts_product_level ADD   product_reach_desc varchar NULL;