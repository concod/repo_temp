--liquibase formatted sql
--changeset liquibase:tb_stg_config_all_config_stores stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for tb_stg_config_all_config_stores

CREATE TABLE price_markdown_opt.tb_stg_config_all_config_stores (
	strategy_config_id int4 NULL,
	store_id int8 NULL
);
CREATE INDEX tb_stg_config_all_config_stores_idx ON price_markdown_opt.tb_stg_config_all_config_stores USING btree (store_id);