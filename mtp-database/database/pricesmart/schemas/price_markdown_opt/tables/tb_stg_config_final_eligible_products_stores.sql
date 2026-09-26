--liquibase formatted sql
--changeset liquibase:tb_stg_config_final_eligible_products_stores stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for tb_stg_config_final_eligible_products_stores

CREATE TABLE price_markdown_opt.tb_stg_config_final_eligible_products_stores (
	strategy_config_id int4 NULL,
	calendar_config_id int4 NULL,
	strategy_name text NULL,
	strategy_start_date date NULL,
	strategy_end_date date NULL,
	product_id int8 NULL,
	store_id int8 NULL,
	age int4 NULL,
	todays_date date NULL,
	threshold_status text NULL,
	is_active bool NULL
);