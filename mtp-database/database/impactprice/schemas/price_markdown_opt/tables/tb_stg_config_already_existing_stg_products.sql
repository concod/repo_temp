--liquibase formatted sql
--changeset liquibase:tb_stg_config_already_existing_stg_products stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for tb_stg_config_already_existing_stg_products

CREATE TABLE price_markdown_opt.tb_stg_config_already_existing_stg_products (
	strategy_id int4 NULL,
	product_id int8 NULL,
	store_id int8 NULL,
	strategy_name text NULL,
	status int2 NULL,
	start_date date NULL,
	end_date date NULL
);