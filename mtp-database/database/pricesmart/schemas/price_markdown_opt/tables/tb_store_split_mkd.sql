--liquibase formatted sql
--changeset anoop:tb_store_split_mkd stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for tb_store_split_mkd

CREATE TABLE price_markdown_opt.tb_store_split_mkd (
	product_id int4 NULL,
	store_id int4 NULL,
	s0_id int4 NULL,
	s1_id int4 NULL,
	week_start_date date NULL,
	store_ratio numeric NULL
)
PARTITION BY RANGE (week_start_date);
CREATE INDEX idx_prd_cid_weekstartdate_mkd ON price_markdown_opt.tb_store_split_mkd USING btree (product_id, week_start_date);
