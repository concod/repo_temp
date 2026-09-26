--liquibase formatted sql
--changeset liquibase:alerts_product_store_level_3 stripComments:false splitStatements:false context:Release_1_1 labels:liquibase_project_start
--comment: initial changeset for alerts_product_store_level
CREATE TABLE IF NOT EXISTS inventory_smart.alerts_product_store_level (
	product_code varchar NOT NULL,
	product_description text NULL,
	store_code varchar NOT NULL,
	store_description varchar NULL,
	merchandise_category varchar NULL,
	planning_ownership varchar NULL,
	l0_name varchar NULL,
	l1_name varchar NULL,
	l2_name varchar NULL,
	product_channel_name varchar NOT NULL,
	channel varchar NULL,
	state varchar NULL,
	district varchar NULL,
	city varchar NULL,
	store_name varchar NULL,
	store_code_name varchar NOT NULL,
	store_channel_description varchar NULL,
	fom_first_weekly_predicted_qty float4 NULL,
	fom_second_weekly_predicted_qty float4 NULL,
	fom_third_weekly_predicted_qty float4 NULL,
	fom_fourth_weekly_predicted_qty float4 NULL,
	fom_next_4_weeks_predicted_qty float4 NULL,
	fom_max_stock float4 NULL,
	fom_store_grade varchar NULL,
	fom_is_resolved int4 NULL,
	msviaf_min float4 NULL,
	msviaf_max float4 NULL,
	msviaf_wos float4 NULL,
	msviaf_model_stock int4 NULL,
	msviaf_fiscal_year_week int4 NULL,
	msviaf_ia_forecast_2weeks float4 NULL,
	msviaf_adjusted_forecast_2weeks float4 NULL,
	msviaf_ia_forecast_4weeks float4 NULL,
	msviaf_adjusted_forecast_4weeks float4 NULL,
	msviaf_last_week_min_model_stock int4 NULL,
	msviaf_product_description varchar NULL,
	msviaf_store_description varchar NULL,
	msviaf_store_grade varchar NULL,
	msviaf_is_resolved int4 NULL,
	ms_date date NULL,
	ms_fiscal_week_end_date date NULL,
	ms_fiscal_year_week int4 NULL,
	ms_min float4 NULL,
	ms_max float4 NULL,
	ms_wos float4 NULL,
	ms_ia_forecasts_store_wos float4 NULL,
	ms_adjusted_forecasts_store_wos float4 NULL,
	ms_model_stock float4 NULL,
	ms_constrained_flag int4 NULL,
	ms_sku_store_constrained_flag varchar NULL,
	ms_store_inventory float4  NULL,
	ms_dc_oh int4 NULL,
	ms_is_resolved int4 NULL,
	ci_date date NULL,
	ci_fiscal_year_week int4 NULL,
	ci_wos float4 NULL,
	ci_adjusted_forecasts_store_wos float4 NULL,
	ci_max float4 NULL,
	ci_min float4 NULL,
	ci_model_stock float4 NULL,
	ci_store_inventory float4  NULL,
	ci_dc_oh int4 NULL,
	ci_next_4_weeks_forecast float4 NULL,
	ci_sku_store_constrained_flag int4 NULL,
	ci_is_resolved int4 NULL,
	forecast_over_max int4 NULL,
	ms_vs_ia_forecast int4 NULL,
	model_stock int4 NULL,
	constrained_inventory int4 NULL
);
DROP INDEX IF EXISTS inventory_smart.alerts_product_store_level_l0_name_idx;
DROP INDEX IF EXISTS inventory_smart.alerts_product_store_level_ph_channel_idx;
CREATE INDEX IF NOT EXISTS alerts_product_store_level_l0_name_idx ON inventory_smart.alerts_product_store_level USING btree (l0_name, product_channel_name);
CREATE INDEX IF NOT EXISTS alerts_product_store_level_ph_channel_idx ON inventory_smart.alerts_product_store_level USING btree (l0_name, l1_name, l2_name, channel);

ALTER TABLE inventory_smart.alerts_product_store_level DROP CONSTRAINT IF EXISTS alerts_product_store_level_fk;
ALTER TABLE inventory_smart.alerts_product_store_level DROP CONSTRAINT IF EXISTS alerts_product_store_level_fk_1;
ALTER TABLE inventory_smart.alerts_product_store_level ADD CONSTRAINT alerts_product_store_level_fk FOREIGN KEY (store_code) REFERENCES "global".store_master(store_code) ON DELETE CASCADE;
ALTER TABLE inventory_smart.alerts_product_store_level ADD CONSTRAINT alerts_product_store_level_fk_1 FOREIGN KEY (product_code) REFERENCES "global".product_master(product_code) ON DELETE CASCADE;

--changeset vishal.kumar:alerts_product_store_level_4 stripComments:false splitStatements:false context:Release_1_9 labels:MTP-23649_3_1
--comment: schema change for alerts_product_store_level_3
ALTER TABLE inventory_smart.alerts_product_store_level ADD COLUMN IF NOT EXISTS ms_edit_tracker int4 NULL;

--changeset vishal.kumar:alerts_product_store_level_5 stripComments:false splitStatements:false context:Release_1_9 labels:MTP-24051_1
--comment: data type change for alerts_product_store_level_4

ALTER TABLE inventory_smart.alerts_product_store_level ALTER COLUMN ms_edit_tracker TYPE text USING ms_edit_tracker::text;

--changeset swapnil.bhange:alerts_product_store_level_6 stripComments:false splitStatements:false context:Release_1_0 labels:MTP-24921
--comment: schema change for alerts_product_store_level_5
ALTER TABLE inventory_smart.alerts_product_store_level ADD COLUMN IF NOT EXISTS ms_sma_ecomm_reserve float4 NULL;
ALTER TABLE inventory_smart.alerts_product_store_level ADD COLUMN IF NOT EXISTS ms_dc_ecomm_reserve float4 NULL;
ALTER TABLE inventory_smart.alerts_product_store_level ADD COLUMN IF NOT EXISTS ms_ecomm_reserve float4 NULL;

--changeset swapnil.bhange:alerts_product_store_level_7 stripComments:false splitStatements:false context:Release_1_0 labels:MTP-24921_2
--comment: schema change for alerts_product_store_level_6
ALTER TABLE inventory_smart.alerts_product_store_level ADD COLUMN IF NOT EXISTS ms_store_code_int varchar NULL;
ALTER TABLE inventory_smart.alerts_product_store_level ADD COLUMN IF NOT EXISTS ms_model_stock_after float4 NULL;

--changeset ashish:alerts_product_store_level_disable_auto_vacuum stripComments:false splitStatements:false context:Release_1_0 labels:MTP-24921_3
--comment: disable_auto_vacuum for alerts_product_store_level
ALTER TABLE inventory_smart.alerts_product_store_level SET (autovacuum_enabled = false);
--changeset laraib.ahmad@impactanalytics.co:alerts_product_level_cf_alert stripComments:false splitStatements:false context:Release_1_0 labels:product_access_hierarchy
--comment:  added column for product_access_hierarchy 
ALTER TABLE inventory_smart.alerts_product_store_level ADD COLUMN IF NOT EXISTS product_access_hierarchy varchar NULL;
ALTER TABLE inventory_smart.alerts_product_store_level ADD COLUMN IF NOT EXISTS store_access_hierarchy varchar NULL;
