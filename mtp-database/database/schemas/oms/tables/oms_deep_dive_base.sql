--liquibase formatted sql
--changeset samarjit.mazumder@impactanalytics.co.co:oms_deep_dive_base stripComments:false splitStatements:false context:Release_1_0 ignore:false labels:briscoes_oms_deep_dive_base
--comment: initial changeset for oms_deep_dive_base

CREATE TABLE IF NOT EXISTS oms.oms_deep_dive_base (
	product_code text NOT NULL,
	loc_code text NOT NULL,
	fiscal_year_week int8 NOT NULL,
	week text NULL,
	"month" text NULL,
	predicted_qty float8 NULL,
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
	approved_receipt float4 NULL,
	ly_sales float8 NULL,
	ly_oh float8 NULL,
	total_stores_count int4 NULL,
	approved_receipt_1 int8 NULL,
	total_dc_forecast_final_roq float8 NULL,
	CONSTRAINT uk_oms_deep_dive_base PRIMARY KEY (product_code, style, article, size, channel, vendor_code, loc_code, fiscal_year_week)
);

--changeset raja.duraisamy@impactanalytics.co:oms_deep_dive_base_performance_indexes_1 stripComments:false splitStatements:false context:performance_optimization labels:OMS_PERFORMANCE_INDEXES
--comment: Performance indexes for oms_deep_dive_base based on query analysis
CREATE INDEX IF NOT EXISTS idx_oms_deep_dive_base_product_loc_vendor_code ON oms.oms_deep_dive_base(product_code, loc_code, vendor_code);
CREATE INDEX IF NOT EXISTS idx_oms_deep_dive_base_product_loc_style_article_size ON oms.oms_deep_dive_base(product_code, loc_code, style, article, size);
CREATE INDEX IF NOT EXISTS idx_oms_deep_dive_base_product_loc_style_article_size_channel ON oms.oms_deep_dive_base(product_code, loc_code, style, article, size, channel);


--changeset raja.duraisamy@impactanalytics.co:oms_deep_dive_base_add_missing_columns stripComments:false splitStatements:false context:generic_schema_update labels:GENERIC_SCHEMA_UPDATE
--comment: Add missing generic schema columns to oms_deep_dive_base
ALTER TABLE oms.oms_deep_dive_base ADD COLUMN IF NOT EXISTS id int8 NULL;
ALTER TABLE oms.oms_deep_dive_base ADD COLUMN IF NOT EXISTS column_updated varchar(256) NULL;

--changeset raja.duraisamy@impactanalytics.co:index_oms_deep_dive_base_drop_indexes stripComments:false splitStatements:false context:generic_schema_update labels:GENERIC_SCHEMA_UPDATE
--comment: Index for oms_deep_dive_base
DROP INDEX IF EXISTS oms.idx_oms_deep_dive_base_product_loc_vendor_code;
DROP INDEX IF EXISTS oms.idx_oms_deep_dive_base_product_loc_style_article_size;
DROP INDEX IF EXISTS oms.idx_oms_deep_dive_base_product_loc_style_article_size_channel;