--liquibase formatted sql
--changeset liquibase:tb_stg_config_eligible_products stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for tb_stg_config_eligible_products

CREATE TABLE price_markdown_opt.tb_stg_config_eligible_products (
	product_id int8 NULL,
	age int4 NULL,
	todays_date date NULL,
	threshold_status text NULL
);
CREATE INDEX tb_stg_config_eligible_products_idx ON price_markdown_opt.tb_stg_config_eligible_products USING btree (product_id);


--changeset nikhil.shet@impactanalytics.co:tb_stg_config_eligible_products_2508_v2 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for tb_stg_config_eligible_products_2508_v2

ALTER TABLE price_markdown_opt.tb_stg_config_eligible_products
	ADD COLUMN store_age int4 NULL,
	ADD COLUMN ecom_age int4 NULL,
	ADD COLUMN st_bnm float4 NULL,
	ADD COLUMN st_ecom float4 NULL,
	ADD COLUMN bnm_threshold_status int4 NULL,
	ADD COLUMN ecom_threshold_status int4 NULL;