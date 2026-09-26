--liquibase formatted sql
--changeset liquibase:tb_stg_config_intermediate_eligible_products_stores stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for tb_stg_config_intermediate_eligible_products_stores

CREATE TABLE price_markdown_opt.tb_stg_config_intermediate_eligible_products_stores (
	strategy_config_id int4 NULL,
	calendar_config_id int4 NULL,
	strategy_name text NULL,
	product_id int4 NULL,
	store_id int4 NULL,
	strategy_start_date date NULL,
	strategy_end_date date NULL,
	strategy_config_name text NULL,
	rank_ps int4 NULL,
	conflict_flag int4 NULL,
	conflicting_stg_id _int4 NULL,
	conflicting_stg_name text NULL,
	conflicting_start_date date NULL,
	conflicting_end_date date NULL,
	age int4 NULL,
	todays_date date NULL,
	threshold_status text NULL
);
CREATE INDEX tb_stg_config_intermediate_eligible_products_stores_flag_idx ON price_markdown_opt.tb_stg_config_intermediate_eligible_products_stores USING btree (conflict_flag, rank_ps, strategy_config_id);