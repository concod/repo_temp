--liquibase formatted sql
--changeset liquibase:tb_product_store_price stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for price_markdown.tb_product_store_price

CREATE TABLE price_markdown.tb_product_store_price (
	product_id int8 NULL,
	store_id int4 NULL,
	markdown_type text NULL,
	original_price float8 NULL,
	current_price float8 NULL,
	effective_from_date date NULL,
	updated_at timestamp NULL
);
CREATE INDEX tb_product_store_price_product_id_idx ON price_markdown.tb_product_store_price USING btree (product_id, store_id);

--changeset kumaran.k@impactanalytics.co:tb_product_store_price_v5 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: datatype change to tb_product_store_price_v5 table

ALTER TABLE price_markdown.tb_product_store_price ADD last_reg_price float8 NULL;