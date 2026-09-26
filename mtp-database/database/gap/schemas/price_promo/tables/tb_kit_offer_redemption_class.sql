--liquibase formatted sql
--changeset liquibase:tb_kit_offer_redemption_class stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for price_promo.tb_kit_offer_redemption_class

CREATE TABLE IF NOT EXISTS price_promo.tb_kit_offer_redemption_class (
	c0_id int4 NULL,
	s1_id int4 NULL,
	slot1 int4 NULL,
	slot2 int4 NULL,
	phase int4 NULL,
	slot1_txn int4 NULL,
	slot2_txn int4 NULL,
	intersecting_txn int4 NULL,
	joint_redemption float8 NULL,
	sum_product float8 NULL
);

--changeset harshith.mandli@impactanalytics.co:create_index_kit_offer_redemption_class stripComments:false splitStatements:false context:Release_1_0 ignore:false labels:tb_kit_offer_redemption_class
--comment: creating index kit_offer_redemption_class
CREATE INDEX kit_offer_redemption_class_idx ON price_promo.tb_kit_offer_redemption_class USING btree (slot1, slot2);