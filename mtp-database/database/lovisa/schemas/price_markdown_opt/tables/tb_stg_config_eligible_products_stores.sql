--liquibase formatted sql
--changeset liquibase:tb_stg_config_eligible_products_stores stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for tb_stg_config_eligible_products_stores

CREATE TABLE price_markdown_opt.tb_stg_config_eligible_products_stores (
	product_id int8 NULL,
	store_id int8 NULL,
	age int4 NULL,
	todays_date date NULL,
	threshold_status text NULL
);
CREATE INDEX tb_stg_config_eligible_products_stores_idx ON price_markdown_opt.tb_stg_config_eligible_products_stores USING btree (product_id, store_id);

--changeset liquibase:tb_stg_config_eligible_products_stores_v091024_fix stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: add strategy_config_id column in tb_stg_config_eligible_products_stores
alter table price_markdown_opt.tb_stg_config_eligible_products_stores
add column strategy_config_id int4 NULL;
