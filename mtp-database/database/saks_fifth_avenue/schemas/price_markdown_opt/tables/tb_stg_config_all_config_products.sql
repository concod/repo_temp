--liquibase formatted sql
--changeset liquibase:tb_stg_config_all_config_products stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for tb_stg_config_all_config_products

CREATE TABLE price_markdown_opt.tb_stg_config_all_config_products (
	strategy_config_id int4 NULL,
	product_id int8 NULL
);
CREATE INDEX tb_stg_config_all_config_products_idx ON price_markdown_opt.tb_stg_config_all_config_products USING btree (product_id);