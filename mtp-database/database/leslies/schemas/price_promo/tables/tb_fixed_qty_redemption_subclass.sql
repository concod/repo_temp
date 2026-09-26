--liquibase formatted sql
--changeset liquibase:tb_fixed_qty_redemption_subclass_v2 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for tb_fixed_qty_redemption_subclass

DROP TABLE if exists price_promo.tb_fixed_qty_redemption_subclass;
CREATE TABLE price_promo.tb_fixed_qty_redemption_subclass (
	c0_name text NULL,
	c0_id int4 NULL,
	s0_name text NULL,
	s0_id int4 NULL,
	l0_cid int4 NULL,
	l1_cid int4 NULL,
	l2_cid int4 NULL,
	l3_cid int4 NULL,
	qty_bucket int4 NULL,
	phase int4 NULL,
	final_redemption_qty float8 NULL
);
CREATE INDEX fixed_qty_redemption_subclass_idx ON price_promo.tb_fixed_qty_redemption_subclass USING btree (c0_id,s0_id,l0_cid,l1_cid,l2_cid,l3_cid);