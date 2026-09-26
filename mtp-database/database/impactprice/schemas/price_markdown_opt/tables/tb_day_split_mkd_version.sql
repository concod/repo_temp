--liquibase formatted sql
--changeset siddharth.bajpai@impactanalytics.co:tb_day_split_mkd_version_20251216 stripComments:false splitStatements:false context:Release_1_0 labels:tb_day_split_mkd
--comment: Create tb_day_split_mkd_version table

CREATE TABLE IF NOT EXISTS price_markdown_opt.tb_day_split_mkd_version (
	l3_cid int4 NOT NULL,
	"date" date NOT NULL,
	simulation_week_start_date date NOT NULL,
	day_split_ratio float8 NULL,
	l0_cid int4 NOT NULL DEFAULT 1,
	s0_id int4 NOT NULL DEFAULT 1,
	s1_id int4 NOT NULL DEFAULT 1,
	version_code int4 NOT NULL,
	CONSTRAINT pk_day_split_mkd_version PRIMARY KEY (l3_cid, date, l0_cid, s0_id, s1_id, version_code)
)
PARTITION BY LIST (version_code);
CREATE INDEX idx_l3cid_brandcid_weekstartdate_tb_day_split_mkd_version ON price_markdown_opt.tb_day_split_mkd_version USING btree (l3_cid, simulation_week_start_date);

