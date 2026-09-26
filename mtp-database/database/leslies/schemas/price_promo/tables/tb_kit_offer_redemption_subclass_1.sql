--liquibase formatted sql
--changeset liquibase:tb_kit_offer_redemption_subclass_1_v3 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for tb_kit_offer_redemption_subclass_1

DROP TABLE if exists price_promo.tb_kit_offer_redemption_subclass_1;
CREATE TABLE price_promo.tb_kit_offer_redemption_subclass_1 (
	c0_name text NULL,
	c0_id int4 NULL,
	s0_name text NULL,
	s0_id int4 NULL,
	slot1 int4 NULL,
	slot2 int4 NULL,
	phase int4 NULL,
	slot1_txn int4 NULL,
	slot2_txn int4 NULL,
	intersecting_txn int4 NULL,
	joint_redemption float8 NULL,
	sum_product float8 NULL
);
CREATE INDEX kit_offer_redemption_subclass_1_idx ON price_promo.tb_kit_offer_redemption_subclass_1 USING btree (slot1, slot2);