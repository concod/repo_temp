--liquibase formatted sql
--changeset liquibase:tb_product_store_price stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for price_markdown.tb_product_store_price

CREATE TABLE price_markdown.tb_product_store_price (
	product_id int8 NOT NULL,
	store_id int4 NOT NULL,
	markdown_type text NOT NULL,
	original_price float8 NULL,
	current_price float8 NULL,
	effective_from_date date NULL,
	updated_at timestamp NULL,
	last_reg_price float8 NULL,
	CONSTRAINT tb_product_store_price_pk PRIMARY KEY (markdown_type, store_id, product_id)
);
CREATE INDEX tb_product_store_price_product_id_idx ON price_markdown.tb_product_store_price USING btree (product_id, store_id);