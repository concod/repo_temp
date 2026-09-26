--liquibase formatted sql
--changeset yashraj.jha@impactanalytics.co:bp_competitor_attributes_9 stripComments:false splitStatements:false context:Release_1_0 labels: liquibase_project_start
--comment: changeset for base_pricing_restaurant.bp_competitor_attributes_9

DROP TABLE IF EXISTS base_pricing_restaurant.bp_competitor_attributes CASCADE;

CREATE TABLE base_pricing_restaurant.bp_competitor_attributes (
    product_id int4 NOT NULL,
    store_id int4 NOT NULL,
    competitor_id int4 NOT NULL,
    competitor text NULL,
    comp_base_price float8 NULL,
    CONSTRAINT pk_bp_competitor_attributes 
        PRIMARY KEY (product_id, store_id, competitor_id)
);
CREATE INDEX idx_bp_competitor_attributes_competitor_id
    ON base_pricing_restaurant.bp_competitor_attributes (competitor_id);