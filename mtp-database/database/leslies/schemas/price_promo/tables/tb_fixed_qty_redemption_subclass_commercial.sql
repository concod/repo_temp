--liquibase formatted sql
--changeset liquibase:tb_fixed_qty_redemption_subclass_commercial_v2 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for tb_fixed_qty_redemption_subclass_commercial


DROP TABLE if exists price_promo.tb_fixed_qty_redemption_subclass_commercial;
CREATE TABLE price_promo.tb_fixed_qty_redemption_subclass_commercial (
	c0_name text NULL,
	c0_id int4 NULL,
	c2_name text NULL,
	c2_id int4 NULL,
	l0_cid int4 NULL,
	l1_cid int4 NULL,
	l2_cid int4 NULL,
	l3_cid int4 NULL,
	qty_bucket int4 NULL,
	phase int4 NULL,
	final_redemption_qty float8 NULL
);
CREATE INDEX fixed_qty_redemption_subclass_commercial_idx ON price_promo.tb_fixed_qty_redemption_subclass_commercial USING btree (c0_id,l0_cid,l1_cid,l2_cid,l3_cid);