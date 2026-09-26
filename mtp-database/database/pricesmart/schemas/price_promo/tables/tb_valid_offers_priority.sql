--liquibase formatted sql
--changeset nikhil.shet@impactanalytics.co:tb_valid_offers_priority stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for tb_valid_offers_priority

CREATE TABLE price_promo.tb_valid_offers_priority (
    product_discount_level_id int4 NOT NULL,
    store_discount_level_id int4 NOT NULL,
    priority_number int4 NOT NULL,
    offer_type_id int4 NOT NULL
);

CREATE INDEX idx_valid_offers_product_level ON price_promo.tb_valid_offers_priority USING btree (product_discount_level_id);
CREATE INDEX idx_valid_offers_product_level_priority ON price_promo.tb_valid_offers_priority USING btree (product_discount_level_id, priority_number);
