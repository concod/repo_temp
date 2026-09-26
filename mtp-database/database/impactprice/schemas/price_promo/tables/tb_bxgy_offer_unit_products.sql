--liquibase formatted sql
--changeset shrrayan.sheel@impactanalytics.co:tb_bxgy_offer_unit_products stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: Initial changeset for price_promo.tb_bxgy_offer_unit_products

CREATE TABLE price_promo.tb_bxgy_offer_unit_products (
	bxgy_offer_units_id int4 NOT NULL,
	product_id int8 NOT NULL,
	CONSTRAINT tb_bxgy_offer_unit_products_pkey PRIMARY KEY (bxgy_offer_units_id, product_id),
    CONSTRAINT tb_bxgy_offer_unit_products_bxgy_offer_units_fk
	FOREIGN KEY (bxgy_offer_units_id)
	REFERENCES price_promo.tb_bxgy_offer_units(bxgy_offer_units_id)
	ON DELETE CASCADE
)
PARTITION BY LIST (bxgy_offer_units_id);