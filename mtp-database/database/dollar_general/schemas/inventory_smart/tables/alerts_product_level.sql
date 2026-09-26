--liquibase formatted sql
--changeset swapnil.bhange:alerts_product_level stripComments:false splitStatements:false context:Release_1_0 labels:0001
--comment: initial changeset for alerts_product_level
CREATE TABLE inventory_smart.alerts_product_level (
	product_code varchar NOT NULL,
	product_description varchar NULL,
	l0_code varchar NOT NULL,
	l0_name varchar NULL,
	l1_name varchar NULL,
	l3_name varchar NULL,
	l4_name varchar NULL,
	primary_sku varchar NULL,
	pa_component_sku varchar NULL,
	pa_quantity_coefficient int4 NULL,
	pa_last_week_sales_units int4 NULL,
	pa_total_inventory float4 NULL,
	pa_dc_total_inventory float4 NULL,
	pa_store_total_inventory float4 NULL,
	pa_last_allocated int4 NULL,
	pa_is_resolved int4 NULL,
	sea_plan_start_date date NULL,
	sea_plan_end_date date NULL,
	sea_plan_expiry_date date NULL,
	sea_updated_at timestamptz NULL,
	sea_dc_on_hand float4 NULL,
	sea_is_resolved int4 NULL,
	lafnpa_fiscal_year_week int4 NULL,
	lafnpa_actual_sales float4 NULL,
	lafnpa_adjusted_forecast_qty float4 NULL,
	lafnpa_inv_oh float4 NULL,
	lafnpa_absolute_error float4 NULL,
	lafnpa_absolute_error_percentage float4 NULL,
	lafnpa_is_resolved int4 NULL,
	lafspa_product_description varchar NULL,
	lafspa_fiscal_year_week int4 NULL,
	lafspa_actual_sales float4 NULL,
	lafspa_adjusted_forecast_qty float4 NULL,
	lafspa_inv_oh float4 NULL,
	lafspa_absolute_error float4 NULL,
	lafspa_absolute_error_percentage float4 NULL,
	lafspa_is_resolved int4 NULL,
	hda_past_4_weeks_actual float4 NULL,
	hda_next_4_weeks_forecast float4 NULL,
	hda_recent_deviation float4 NULL,
	hda_is_resolved int4 NULL,
	pdq_alert int4 NULL,
	season_ending_alert int4 NULL,
	low_accuracy_forecast_new_products_alert int4 NULL,
	low_accuracy_forecast_seasonal_products_alert int4 NULL,
	high_deviation_alert int4 NULL
);

-- inventory_smart.alerts_product_level foreign keys

ALTER TABLE inventory_smart.alerts_product_level ADD CONSTRAINT alerts_product_level_product_fk FOREIGN KEY (product_code) REFERENCES "global".product_master(product_code) ON DELETE CASCADE;

--changeset swapnil.bhange-1:alerts_product_level_v2 stripComments:false splitStatements:false context:Release_1_0 labels:alerts-2
--comment: changed data type for alerts_product_level columns
ALTER TABLE inventory_smart.alerts_product_level ALTER COLUMN pa_quantity_coefficient TYPE varchar;

--changeset swapnil.bhange-3:alerts_product_level_v3 stripComments:false splitStatements:false context:Release_1_0 labels:alerts-3
--comment: added two columns for alerts_product_level 
alter table inventory_smart.alerts_product_level add column if not exists article varchar null;
alter table inventory_smart.alerts_product_level add column if not exists launch_date date null;


