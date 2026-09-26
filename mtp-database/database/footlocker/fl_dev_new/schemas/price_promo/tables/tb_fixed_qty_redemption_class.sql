--liquibase formatted sql
--changeset liquibase:tb_fixed_qty_redemption_class stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for price_promo.tb_fixed_qty_redemption_class

CREATE TABLE IF NOT EXISTS price_promo.tb_fixed_qty_redemption_class (
	c0_id int4 NULL,
	s1_id int4 NULL,
	l0_cid int4 NULL,
	l1_cid int4 NULL,
	l2_cid int4 NULL,
	l3_cid int4 NULL,
	qty_bucket int4 NULL,
	phase int4 NULL,
	final_redemption_qty float8 NULL
);
