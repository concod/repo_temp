--liquibase formatted sql
--changeset samarjit.mazumder@impactanalytics.co:forecast_alerts stripComments:false splitStatements:false context:Release_1_0 labels:sm_article_inventory_dashboard
--comment: initial changeset for forecast_alerts

CREATE table if not exists inventory_smart.forecast_alerts
(article	text NOT NULL,
l0_name	text NULL,
l1_name	text NULL,
l2_name	text NULL,
l3_name	text NULL,
l4_name	text NULL,
l5_name	text NULL,
l6_name	text NULL,
style_name	text null,
local_flag text NULL,
info_lifecycle_description text NULL,
lw_qty	float4 null,
lw_revenue	float4 null,
lw_margin	float4 null,
promo_percentage	float4 null,
past_4_weeks_actual	float4 null,
past_4_weeks_forecast	float4 null,
forecast_deviation	float4 null,
sku_count_deviation	float4 null,
store_penetration_deviation	float4 null,
discount_deviation	float4 null,
msrp_deviation	float4 null,
inventory_deviation	float4 null,
model_error	float4 null,
past_4_weeks_sales_avg	float4 null,
past_4_weeks_sales_deseason_avg	float4 null,
next_4_weeks_forecast_avg	float4 null,
next_4_weeks_forecast_deseason_avg	float4 null,
weekly_sales_ly_avg	float4 null,
deviation_ly	float4 null,
deviation_recent_ros	float4 null,
deviation_in_driver_estimates_flag	int4 NULL,
forecast_unexplainable_by_drivers_flag	int4 NULL,
low_model_confidence_flag	int4 NULL,
key_driver_volatility_flag	int4 NULL,
sales_forecast_divergence_flag int4 NULL,
CONSTRAINT forecast_alerts_pk PRIMARY KEY (article)
);

--changeset samarjit.mazumder@impactanalytics.co:added_new_column stripComments:false splitStatements:false context:Release_1_0 ignore:false labels:briscoes_added_new_column
--comment: added_new_column
alter table inventory_smart.forecast_alerts add column if not exists deviation_in_driver_estimates_is_resolved int4 DEFAULT 0 null;
alter table inventory_smart.forecast_alerts add column if not exists forecast_unexplainable_by_drivers_is_resolved int4 DEFAULT 0 null;
alter table inventory_smart.forecast_alerts add column if not exists low_model_confidence_is_resolved int4 DEFAULT 0 null;
alter table inventory_smart.forecast_alerts add column if not exists key_driver_volatility_is_resolved int4 DEFAULT 0 null;
alter table inventory_smart.forecast_alerts add column if not exists sales_forecast_divergence_is_resolved int4 DEFAULT 0 null;

--changeset samarjit.mazumder@impactanalytics.co:deviation_type_added stripComments:false splitStatements:false context:Release_1_0 ignore:false labels:briscoes_added_new_column
--comment: deviation_type_added
alter table inventory_smart.forecast_alerts add column if not exists deviation_type text null;

--changeset samarjit.mazumder@impactanalytics.co:new_product_is_resolved stripComments:false splitStatements:false context:Release_1_0 ignore:false labels:briscoes_new_product_is_resolved
--comment: new_product_is_resolved
alter table inventory_smart.forecast_alerts add column if not exists new_product_is_resolved int4 DEFAULT 0 null;
alter table inventory_smart.forecast_alerts add column if not exists new_product_flag int4 NULL;

-- changeset srinivasgowda.sg@impactanalytics.co:article_inventory_dashboard_rename stripComments:false splitStatements:false context:db_sync labels:rename to base
-- comment: rename to base 
ALTER TABLE inventory_smart.forecast_alerts 
RENAME TO forecast_alerts_base;


