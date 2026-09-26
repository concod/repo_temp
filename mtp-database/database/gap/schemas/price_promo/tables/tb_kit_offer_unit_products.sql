--liquibase formatted sql
--changeset shrrayan.sheel@impactanalytics.co:tb_kit_offer_unit_products stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: Initial changeset for price_promo.tb_kit_offer_unit_products

CREATE TABLE price_promo.tb_kit_offer_unit_products (
	kit_offer_units_id int4 NOT NULL,
	product_id int8 NOT NULL,
	CONSTRAINT tb_kit_offer_unit_products_pkey PRIMARY KEY (kit_offer_units_id, product_id),
	CONSTRAINT tb_kit_offer_unit_products_kit_offer_units_fk
	FOREIGN KEY (kit_offer_units_id)
	REFERENCES price_promo.tb_kit_offer_units(kit_offer_units_id)
	ON DELETE CASCADE
)
PARTITION BY LIST (kit_offer_units_id);