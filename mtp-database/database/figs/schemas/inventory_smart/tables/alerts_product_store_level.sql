
--liquibase formatted sql
--changeset keerthi.vardhani@impactanalytics.co:alerts_product_store_level stripComments:false splitStatements:false context:Release_1_0 ignore:false labels:figs_alerts_product_store_level
--comment: initial changeset for alerts_product_store_level

CREATE TABLE IF NOT EXISTS inventory_smart.alerts_product_store_level (
	article text NOT NULL,
	store_code text NOT NULL,
	l0_name text NULL,
	l1_name text NULL,
	l2_name text NULL,
	l3_name text NULL,
	l4_name text NULL,
	s0_name text NULL,
	s1_name text NULL,
	s2_name text NULL,
	channel text NULL,
    channel_name text NULL,
    product_description text NULL,
	dc_flag bool NULL,
	excs_flg int4 NULL,
	shrtfl_flg int4 NULL,
	stckout_flg int4 NULL,
	overstock int4 NULL,
	shortfall int4 NULL,
	stockout int4 NULL,
	normal int4 NULL,
	oh float4 NULL,
	it float4 NULL,
	oo float4 NULL,
	lw_units int4 NULL,
	lw_revenue float4 NULL,
	lw_margin float4 NULL,
	promo_percentage float4 NULL,
	fwos float4 NULL,
	size_integrity float4 NULL,
	week_to_date_sales float4 NULL,
	last_day_sales float4 NULL,
	oh_dc float4 NULL,
	sales_1_ago float4 NULL,
	sales_2_ago float4 NULL,
	sales_3_ago float4 NULL,
	sales_4_ago float4 NULL,
	sales_5_ago float4 NULL,
	sales_6_ago float4 NULL,
	sales_7_ago float4 NULL,
	sales_8_ago float4 NULL,
	lw_aur float4 NULL,
    lw_aps float4 null,
    lw_store_units int4 null,
    lw_sfs_units int4 null,
    lw_price float4 null,
    wos_oh float4 null,
    promo_deviation_pct float4 null,
    past_4_weeks_actual_promo float4 null,
    next_4_weeks_planned_promo float4 null,
    ly_deviation_pct float4 null,
    ly_past_4wks_actual_sales int4 null,
    ly_next_4wks_actual_sales int4 null,
    past_4wks_promo_pct float4 null,
    store_count_deviation_pct float4 null,
    next_4wks_store_count float4 null,
    past_4wks_store_count float4 null,
    past_4wks_actual_sales int4 null,
    forecast_deviation_pct float4 null,
    in_stock_percentage float4 NULL,
     first_sale_date date null,
     last_receipt_date date null,
    color_name varchar null,
    tot_inv  float4 null,
	clearance_alert_flag int4 NULL,
	newly_launched_alert_flag int4 NULL,
	"Retirement_alert_flag" int4 null,
    sell_through_rate float4 null,
    wos_oh_it float4 null,
    forecast_this_wk float4 null,
    forecast_next_week float4 null,
    forecast_4_next_week float4 null,
    forecast_8_next_week float4 null,
    next_4wks_promo_pct float4 null,
    mfp_forecast_4_next_wk int4 null,
    no_of_stores_oh int4 null,
    store_name varchar null,
     excs_is_resolved int4 null,
     shrtfl_is_resolved int4 null,
     stckout_is_resolved int4 null,
     oo_dc float4 null,
     lw_discount_amount float4 null,
    lw_discount_percentage float4 null,
     dc_available int4 null,
     style varchar null,
     dc_oo float4 null,
     dc_oo_30_days int4 null,
     hybrid_wos float4 null,
     hybrid_wos_oh_it float4 null,
     upas float4 null,
     style_color_status varchar null,
     dc_oo_po int4 null,
     it_dc float4 null,
     available_stores_percentage float4 null,
     in_stock_count int4 null,
     total_count int4 null,
     store_level_prediction float4 null,
	CONSTRAINT alerts_product_store_level_pk PRIMARY KEY (article, store_code)
);
CREATE INDEX if not exists alerts_product_store_level_article_idx ON inventory_smart.alerts_product_store_level USING btree (article);
CREATE INDEX if not exists alerts_product_store_level_store_code_idx ON inventory_smart.alerts_product_store_level USING btree (store_code);




--changeset abhishek.sagar@impactanalytics.co:product_attributes_filter_add_col stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment:  addition of col changeset for alerts channel level
ALTER TABLE inventory_smart.alerts_product_store_level
ADD COLUMN IF NOT EXISTS color_id varchar null,
ADD COLUMN IF NOT EXISTS replenish_status varchar null,
ADD COLUMN IF NOT EXISTS style_type varchar null,
ADD COLUMN IF NOT EXISTS f_style_fabric varchar null,
ADD COLUMN IF NOT EXISTS style_name varchar null,
DROP COLUMN IF EXISTS style,
DROP COLUMN IF EXISTS color_name;

--changeset abhishek.sagar@impactanalytics.co:alerts_ps_lvl stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment:  addition of col changeset for alerts store level
ALTER TABLE inventory_smart.alerts_product_store_level
ADD COLUMN IF NOT EXISTS style varchar null;

--changeset abhishek.sagar@impactanalytics.co:alerts_ps_lvl_v1 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment:  addition of col changeset for psl
ALTER TABLE inventory_smart.alerts_product_store_level
ADD COLUMN IF NOT EXISTS color_name varchar null;