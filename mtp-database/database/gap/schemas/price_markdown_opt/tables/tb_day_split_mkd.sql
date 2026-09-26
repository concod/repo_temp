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

--changeset siddharth.bajpai@impactanalytics.co:sync_tb_day_split_mkd_20251216_v2 stripComments:false splitStatements:false context:Release_1_0 ignore:false labels:tb_day_split_mkd
--comment: Sync tb_day_split_mkd table structure with dev DB

DROP TABLE IF EXISTS price_markdown_opt.tb_day_split_mkd CASCADE;

--changeset siddharth.bajpai@impactanalytics.co:sync_tb_day_split_mkd_20251216_v3 stripComments:false splitStatements:false context:Release_1_0 ignore:false labels:tb_day_split_mkd
--comment: Sync tb_day_split_mkd table structure with dev DB
CREATE TABLE price_markdown_opt.tb_day_split_mkd (
    l3_cid int4 NOT NULL,
    "date" date NOT NULL,
    simulation_week_start_date date NOT NULL,
    day_split_ratio float8 NULL,
    l0_cid int4 NOT NULL,
    s0_id int4 NOT NULL,
    s1_id int4 NOT NULL,
    CONSTRAINT pk_day_split_mkd PRIMARY KEY (l0_cid, l3_cid, s0_id, s1_id, date)
)
PARTITION BY RANGE (date);
CREATE INDEX idx_l3cid_brandcid_weekstartdate_tb_day_split_mkd ON price_markdown_opt.tb_day_split_mkd USING btree (l3_cid, simulation_week_start_date);