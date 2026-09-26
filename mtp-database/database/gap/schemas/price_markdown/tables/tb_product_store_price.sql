--liquibase formatted sql
--changeset surya.avinash@impactanalytics.co:tb_product_store_price stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: updated schema for price_markdown.tb_product_store_price


CREATE TABLE price_markdown.tb_product_store_price (
	product_id int4 NOT NULL,
	store_id int4 NOT NULL,
	l0_name text NULL,
	sku text NULL,
	currency_id int4 NULL,
	msrp float4 NULL,
	current_price float4 NULL,
	effective_from_date date NULL,
	updated_at date NULL,
	last_reg_price float4 NULL,
	CONSTRAINT tb_product_store_price_mkd_pk PRIMARY KEY (product_id, store_id)
);
CREATE INDEX tb_product_store_price_product_id_idx ON price_markdown.tb_product_store_price USING btree (product_id, store_id);

--changeset liquibase:tb_product_store_price_v04122025 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: updating the schema

ALTER TABLE price_markdown.tb_product_store_price DROP COLUMN IF EXISTS l0_name;
ALTER TABLE price_markdown.tb_product_store_price DROP COLUMN IF EXISTS last_reg_price;
ALTER TABLE price_markdown.tb_product_store_price DROP COLUMN IF EXISTS sku;
ALTER TABLE price_markdown.tb_product_store_price ADD COLUMN IF NOT EXISTS cost float4 NULL;
ALTER TABLE price_markdown.tb_product_store_price ADD COLUMN IF NOT EXISTS current_price_with_vat float4 NULL;
ALTER TABLE price_markdown.tb_product_store_price ADD COLUMN IF NOT EXISTS msrp_with_vat float4 NULL;

--changeset siddharth.bajpai@impactanalytics.co:sync_tb_product_store_price_20251216 stripComments:false splitStatements:false context:Release_1_0 ignore:false labels:tb_product_store_price
--comment: Sync tb_product_store_price table structure with dev DB

ALTER TABLE price_markdown.tb_product_store_price ALTER COLUMN updated_at TYPE timestamp USING updated_at::timestamp;