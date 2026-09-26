--liquibase formatted sql
--changeset anoop:tb_day_split_mkd stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for tb_day_split_mkd

CREATE TABLE price_markdown_opt.tb_day_split_mkd (
	l3_cid int4 NULL,
	brand_cid int4 NULL,
	dates date NULL,
	week_start_date date NULL,
	day_ratio_bnm numeric NULL,
	day_ratio_ecom numeric NULL
)
PARTITION BY RANGE (dates);
CREATE INDEX idx_l3cid_brandcid_weekstartdate_tb_day_split_mkd ON price_markdown_opt.tb_day_split_mkd USING btree (l3_cid, brand_cid, week_start_date);
