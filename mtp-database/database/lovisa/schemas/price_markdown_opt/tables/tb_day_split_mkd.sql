--liquibase formatted sql
--changeset keerthana.reddy@impactanalytics.co:tb_day_split_mkd_04082025 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: updated schema for tb_day_split_mkd

CREATE TABLE price_markdown_opt.tb_day_split_mkd (
	l3_cid int4 NOT NULL,
	"date" date NOT NULL,
	week_start_date date NOT NULL,
	day_ratio_bnm numeric NOT NULL,
	day_ratio_ecom numeric NOT NULL,
	CONSTRAINT tb_day_split_mkd_pk PRIMARY KEY (l3_cid, "date")
)
PARTITION BY RANGE ("date");
CREATE INDEX idx_l3cid_weekstartdate_tb_day_split_mkd ON price_markdown_opt.tb_day_split_mkd USING btree (l3_cid, week_start_date);
