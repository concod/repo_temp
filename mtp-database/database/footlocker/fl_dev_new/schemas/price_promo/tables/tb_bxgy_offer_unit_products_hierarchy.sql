--liquibase formatted sql
--changeset shrrayan.sheel@impactanalytics.co:tb_bxgy_offer_unit_products_hierarchy stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: Initial changeset for price_promo.tb_bxgy_offer_unit_products_hierarchy

CREATE TABLE price_promo.tb_bxgy_offer_unit_products_hierarchy (
	bxgy_offer_units_id int4 NOT NULL,
	hierarchy_level_id int8 NOT NULL,
	hierarchy_level_name varchar NULL,
	hierarchy_value_id int8 NOT NULL,
	hierarchy_value_name varchar NULL,
	CONSTRAINT tb_bxgy_offer_unit_hierarchy_pkey PRIMARY KEY (bxgy_offer_units_id, hierarchy_level_id, hierarchy_value_id),
    CONSTRAINT tb_bxgy_offer_unit_hierarchy_bxgy_offer_units_fk FOREIGN KEY (bxgy_offer_units_id) REFERENCES price_promo.tb_bxgy_offer_units(bxgy_offer_units_id)
    ON DELETE CASCADE
);
CREATE INDEX tb_bxgy_offer_unit_products_hierarchy_idx ON price_promo.tb_bxgy_offer_unit_products_hierarchy USING btree (bxgy_offer_units_id);