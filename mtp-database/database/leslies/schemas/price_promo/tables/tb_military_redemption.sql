--liquibase formatted sql
--changeset vaibhav.singh@impactanalytics.co:tb_military_redemption_v2 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for tb_military_redemption

DROP table if exists price_promo.tb_military_redemption;
CREATE TABLE price_promo.tb_military_redemption (
	fiscal_year int4 NULL,
	phase int4 NULL,
	s3_id int4 NULL,
	l0_cid int4 NULL,
	military_txn_count int4 NULL,
	all_txn_count int4 NULL,
	txn_redemption float8 NULL,
	military_cust_count int4 NULL,
	all_cust_count int4 NULL,
	cust_redemption float8 NULL
);
CREATE INDEX tb_military_redemption_idx ON price_promo.tb_military_redemption USING btree (fiscal_year, phase, s3_id, l0_cid);