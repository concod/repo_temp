--liquibase formatted sql
    --changeset vaibhav.singh@impactanalytics.co:tb_store_split_opt_kvi_v2 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
    --comment: initial changeset for tb_store_split_opt_kvi

DROP TABLE if exists price_promo_opt.tb_store_split_opt_kvi;

CREATE TABLE price_promo_opt.tb_store_split_opt_kvi (
	product_id int4 NULL,
	store_id int4 NULL,
	c0_id int4 NULL,
	week_start_date date NULL,
	store_split_ratio float8 NULL
)
PARTITION BY RANGE (week_start_date);
CREATE INDEX tb_store_split_opt_kvi_idx ON price_promo_opt.tb_store_split_opt_kvi USING btree (product_id, store_id, c0_id, week_start_date);