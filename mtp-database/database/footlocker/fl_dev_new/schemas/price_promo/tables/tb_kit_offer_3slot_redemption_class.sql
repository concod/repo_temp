--liquibase formatted sql
--changeset liquibase:tb_kit_offer_3slot_redemption_class stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for price_promo.tb_kit_offer_3slot_redemption_class

CREATE TABLE IF NOT EXISTS price_promo.tb_kit_offer_3slot_redemption_class (
	c0_id int4 NULL,
	s1_id int4 NULL,
	slot1 int4 NULL,
	slot2 int4 NULL,
	slot3 int4 NULL,
	phase int4 NULL,
	slot1_txn int4 NULL,
	slot2_txn int4 NULL,
	slot3_txn int4 NULL,
	intersecting_txn int4 NULL,
	joint_redemption float8 NULL,
	sum_product float8 NULL
);
