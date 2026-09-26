--liquibase formatted sql
--changeset vaibhav.singh@impactanalytics.co:tb_accublue_redemption_v2 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for tb_accublue_redemption

DROP TABLE if exists price_promo.tb_accublue_redemption;
CREATE TABLE price_promo.tb_accublue_redemption (
	fiscal_year int4 NULL,
	phase int4 NULL,
	s3_id int4 NULL,
	l0_cid int4 NULL,
	ab_txn_count int4 NULL,
	all_txn_count int4 NULL,
	txn_redemption float8 NULL,
	ab_cust_count int4 NULL,
	all_cust_count int4 NULL,
	cust_redemption float8 NULL
);
CREATE INDEX tb_accublue_redemption_idx ON price_promo.tb_accublue_redemption USING btree (fiscal_year, phase, s3_id, l0_cid);