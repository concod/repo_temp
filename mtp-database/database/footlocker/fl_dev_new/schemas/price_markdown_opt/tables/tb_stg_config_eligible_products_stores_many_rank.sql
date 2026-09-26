--liquibase formatted sql
--changeset liquibase:tb_stg_config_eligible_products_stores_many_rank stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for tb_stg_config_eligible_products_stores_many_rank

CREATE TABLE price_markdown_opt.tb_stg_config_eligible_products_stores_many_rank (
	strategy_config_id int8 NULL,
	product_id int8 NULL,
	store_id int8 NULL,
	age_original int4 NULL,
	age int4 NULL,
	st float8 NULL,
	age_eligible int4 NULL,
	monthly_st_eligible float8 NULL,
	todays_date date NULL,
	strategy_start_date date NULL,
	max_product_level int4 NULL,
	l2_cid int8 NULL,
	l2_id text NULL,
	l2_name text NULL,
	l2_cuq text NULL,
	config_rank int4 NULL
);
CREATE INDEX tb_stg_config_eligible_products_stores_many_rank_config_rank_id ON price_markdown_opt.tb_stg_config_eligible_products_stores_many_rank USING btree (config_rank);


--changeset surya.avinash@impactanalytics.co:tb_stg_config_eligible_products_stores_many_rank_v061124 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: added column age_force
ALTER TABLE  price_markdown_opt.tb_stg_config_eligible_products_stores_many_rank
ADD COLUMN age_force int4 NULL;