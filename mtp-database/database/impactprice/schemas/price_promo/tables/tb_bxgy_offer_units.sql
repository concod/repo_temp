--liquibase formatted sql
--changeset shrrayan.sheel@impactanalytics.co:tb_bxgy_offer_units stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: Initial changeset for price_promo.tb_bxgy_offer_units

CREATE TABLE price_promo.tb_bxgy_offer_units (
    bxgy_offer_units_id serial4 NOT NULL,
    unit_name varchar(20) NOT NULL,
	units_count int4 NOT NULL,
    product_selection_type int2 NULL,
    bxgy_offer_id int4 NOT NULL,
    CONSTRAINT tb_bxgy_offer_units_pkey PRIMARY KEY (bxgy_offer_units_id),
    CONSTRAINT tb_bxgy_offer_units_bxgy_offer_fk FOREIGN KEY (bxgy_offer_id) REFERENCES price_promo.tb_bxgy_offer(bxgy_offer_id)
    ON DELETE CASCADE
);