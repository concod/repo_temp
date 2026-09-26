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
