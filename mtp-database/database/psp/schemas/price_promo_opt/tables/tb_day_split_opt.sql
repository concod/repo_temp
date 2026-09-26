--liquibase formatted sql
--changeset DB@impactanalytics.co:tb_day_split_opt stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: initial changeset for tb_day_split_opt

CREATE TABLE price_promo_opt.tb_day_split_opt (
	l3_cid int4 NOT NULL,
	"date" date NOT NULL,
	week_start_date date NOT NULL,
	day_split_ratio float8 NULL
)
PARTITION BY RANGE (date);
CREATE INDEX idx_l3cid_brandcid_weekstartdate_tb_day_split_opt ON price_promo_opt.tb_day_split_opt USING btree (l3_cid, week_start_date);