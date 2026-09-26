--liquibase formatted sql
--changeset vaibhav.singh@impactanalytics.co:tb_coupon_redemption_v3 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for tb_coupon_redemption

DROP TABLE if exists price_promo.tb_coupon_redemption;

CREATE TABLE price_promo.tb_coupon_redemption (
	phase int4 NULL,
	c0_id int4 NULL,
	s0_id int4 NULL,
	l0_cid int4 NULL,
	l1_cid int4 NULL,
	l2_cid int4 NULL,
	l3_cid int4 NULL,
	coupon_rev_proportion float8 NULL,
	unique_coupon_cust int4 NULL
);
CREATE INDEX tb_coupon_redemption_idx ON price_promo.tb_coupon_redemption USING btree (phase, c0_id, s0_id, l0_cid,l1_cid,l2_cid,l3_cid);