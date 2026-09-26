--liquibase formatted sql
    --changeset vaibhav.singh@impactanalytics.co:tb_day_split_opt_kvi_v2 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
    --comment: initial changeset for tb_day_split_opt_kvi

DROP TABLE if exists price_promo_opt.tb_day_split_opt_kvi;
CREATE TABLE price_promo_opt.tb_day_split_opt_kvi (
	product_id int4 NULL,
	s0_id int4 NULL,
	c0_id int4 NULL,
	"date" date NULL,
	day_split_ratio float8 NULL
)
PARTITION BY RANGE (date);
CREATE INDEX tb_day_split_opt_kvi_idx ON price_promo_opt.tb_day_split_opt_kvi USING btree (product_id, s0_id, c0_id, date);
