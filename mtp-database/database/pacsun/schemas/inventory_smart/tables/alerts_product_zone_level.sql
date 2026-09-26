--liquibase formatted sql
--changeset sreevathsa.sp@impactanalytics.co:alerts_product_zone_level_v3 stripComments:false splitStatements:false context:Release_1_0 ignore:false labels:pascun_alerts_product_zone_level
--comment: initial changeset for alerts_product_zone_level

CREATE TABLE IF NOT EXISTS inventory_smart.alerts_product_zone_level (
	article text NOT NULL,
	"style" text NULL,
	color_name varchar NULL,
	l0_name text NULL,
	l1_name text NULL,
	l2_name text NULL,
	l3_id_name text NULL,
	l4_id text NULL,
	brand varchar NULL,
	markdown_ind varchar NULL,
	product_description varchar NULL,
	first_sale_date date NULL,
	last_receipt_date date NULL,
	s0_name text NULL,
	oh float4 NULL,
	it float4 NULL,
	dc_available float4 NULL,
	past_4wks_actual_sales float4 NULL,
	forecast_4_next_wk float4 NULL,
	forecast_deviation_pct float4 NULL,
	past_4wks_store_count int4 NULL,
	next_4wks_store_count int4 NULL,
	store_count_deviation_pct float4 NULL,
	ly_past_4wks_actual_sales float4 NULL,
	ly_next_4wks_actual_sales float4 NULL,
	ly_deviation_pct float4 NULL,
	past_4_weeks_actual_promo float4 NULL,
	next_4_weeks_planned_promo float4 NULL,
	promo_deviation_pct float4 NULL,
	clearance_alert_flag int4 NULL,
	newly_launched_alert_flag int4 NULL,
	"Retirement_alert_flag" int4 NULL,
	mfp_forecast_sales_qty float8 NULL,
	mfp_deviation float4 NULL,
	recent_deviation_flag int4 NULL,
	mfp_deviation_flag int4 NULL,
	recent_deviation_is_resolved int4 NULL,
	mfp_deviation_is_resolved int4 NULL,
	CONSTRAINT alerts_product_zone_level_uk UNIQUE (article, s0_name)
);

--changeset sreevathsa.sp@impactanalytics.co:alerts_product_zone_level_add_ladder_v2 stripComments:false splitStatements:false context:Release_1_0 ignore:false labels:pacsun_alerts_product_zone_level_add_ladder
--comment: Add ladder column to alerts_product_zone_level
alter table inventory_smart.alerts_product_zone_level add column if not exists ladder varchar null;

--changeset sreevathsa.sp@impactanalytics.co:alerts_product_zone_level_add_channel_columns stripComments:false splitStatements:false context:Release_1_0 ignore:false labels:pacsun_alerts_product_zone_level_add_channel
--comment: Add channel column to alerts_product_zone_level
alter table inventory_smart.alerts_product_zone_level add column if not exists channel varchar null,
add column if not exists channel_name varchar null;

--changeset sreevathsa.sp@impactanalytics.co:alerts_product_zone_level_drop_channel_columns stripComments:false splitStatements:false context:Release_1_0 ignore:false labels:pacsun_alerts_product_zone_level_drop_channel_columns
--comment: alerts_product_zone_level_drop_channel_columns
alter table inventory_smart.alerts_product_zone_level drop column if exists channel,
drop column if exists channel_name;