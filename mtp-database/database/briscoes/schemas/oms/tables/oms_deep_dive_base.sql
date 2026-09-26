--liquibase formatted sql
--changeset samarjit.mazumder@impactanalytics.co.co:oms_deep_dive_base stripComments:false splitStatements:false context:Release_1_0 ignore:false labels:briscoes_oms_deep_dive_base
--comment: initial changeset for oms_deep_dive_base

CREATE TABLE IF NOT EXISTS inventory_smart.oms_deep_dive_base (
	product_code text NOT NULL,
	loc_code text NOT NULL,
	fiscal_year_week int8 NOT NULL,
	week text NULL,
	"month" text NULL,
	predicted_qty float8 NULL,
	f0_ int8 NULL,
	rolling_std_dev float8 NULL,
	rolling_forecast float8 NULL,
	variance float8 NULL,
	safety_stock float8 NULL,
	receipt1 int8 NULL,
	receipt1_qc int8 NULL,
	total_dc_forecast float8 NULL,
	dc_inv float8 NULL,
	lost_sales float8 NULL,
	"style" text NOT NULL,
	article text NOT NULL,
	"size" text NOT NULL,
	channel text NOT NULL,
	vendor_code text NOT NULL,
	vendor_name text NULL,
	week_starting text NULL,
	week_ending text NULL,
	total_mins int8 NULL,
	additional_forecast int8 NULL,
	additional_inventory int8 NULL,
	inventory_deficit int8 NULL,
	ecom_forecast float8 NULL,
	ecom_reserve float8 NULL,
	created_by int8 NULL,
	created_at timestamptz NULL,
	updated_by int8 NULL,
	updated_at timestamptz NULL,
	eff_lead_time int4 NULL,
	CONSTRAINT uk_oms_deep_dive_base PRIMARY KEY (product_code, style, article, size, channel, vendor_code, loc_code, fiscal_year_week)
);

--changeset samarjit.mazumder@impactanalytics.co.co:add_column_approved_receipt stripComments:false splitStatements:false context:Release_1_0 ignore:false labels:briscoes_add_column_approved_receipt
--comment: add_column_approved_receipt
alter table inventory_smart.oms_deep_dive_base add column if not exists approved_receipt float4 NULL;

--changeset samarjit.mazumder@impactanalytics.co.co:drop_column_f0_ stripComments:false splitStatements:false context:Release_1_0 ignore:false labels:briscoes_drop_column_f0_
--comment: drop_column_f0_
alter table inventory_smart.oms_deep_dive_base drop column if exists f0_;

--changeset samarjit.mazumder@impactanalytics.co.co:add_col_oms_deep_dive_base stripComments:false splitStatements:false context:Release_1_0 ignore:false labels:briscoes_add_col_oms_deep_dive_base1
--comment: add_col_oms_deep_dive_base
ALTER TABLE inventory_smart.oms_deep_dive_base ADD COLUMN IF NOT EXISTS total_dc_forecast_final_roq float4 NULL;

--changeset samridhi.gupta:oms_deep_dive_base_ly_oh_added_if_not_exist stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: oms_deep_dive_base_ly_oh_added_if_not_exist
ALTER TABLE inventory_smart.oms_deep_dive_base ADD COLUMN IF NOT EXISTS ly_oh float4 NULL;
ALTER TABLE inventory_smart.oms_deep_dive_base ADD COLUMN IF NOT EXISTS ly_sales float4 NULL;

--changeset samridhi.gupta:total_stores_count_added stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: oms_deep_dive_base_ly_oh_added_if_not_exist
ALTER TABLE inventory_smart.oms_deep_dive_base ADD COLUMN IF NOT EXISTS total_stores_count float4 NULL;