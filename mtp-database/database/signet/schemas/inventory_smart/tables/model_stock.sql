--liquibase formatted sql
--changeset swapnil.bhange@impactanalytics.co:model_stock_1 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for model_stock

CREATE TABLE IF NOT EXISTS inventory_smart.model_stock (
	product_code varchar NOT NULL,
	product_description text NULL,
	store_code varchar NOT NULL,
	store_description text NULL,
	date date not NULL,
	article_status_tag varchar NULL,
	eligibility int4 NULL,
	fiscal_week_end_date date NULL,
	fiscal_year_week int4 NULL,
	min float4 NULL,
	max float4 NULL,
	wos float4 NULL,
	ia_forecasts_store_wos float4 NULL,
	adjusted_forecasts_store_wos float4 NULL,
	model_stock_before float4 NULL,
	model_stock_after float4 NULL,
	model_stock float4 NULL,
	constrained_flag int4 NULL,
	sku_store_constrained_flag int4 NULL,
	is_resolved int4 NULL
);
ALTER TABLE inventory_smart.model_stock DROP CONSTRAINT IF EXISTS model_stock_store_fk;
ALTER TABLE inventory_smart.model_stock DROP CONSTRAINT IF EXISTS model_stock_product_fk;
ALTER TABLE inventory_smart.model_stock DROP CONSTRAINT IF EXISTS model_stock_un;
ALTER TABLE inventory_smart.model_stock ADD CONSTRAINT model_stock_store_fk FOREIGN KEY (store_code) REFERENCES "global".store_master(store_code) ON DELETE CASCADE;
ALTER TABLE inventory_smart.model_stock ADD CONSTRAINT model_stock_product_fk FOREIGN KEY (product_code) REFERENCES "global".product_master(product_code) ON DELETE CASCADE;
ALTER TABLE inventory_smart.model_stock ADD CONSTRAINT model_stock_un UNIQUE (product_code, store_code, "date");
