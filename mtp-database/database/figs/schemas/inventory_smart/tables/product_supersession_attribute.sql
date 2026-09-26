--liquibase formatted sql
--changeset abhishek.sagar@impactanalytics.co:product_supersession_attribute_figs stripComments:false splitStatements:false context:Release_1_0 labels:figs_product_supersession_attributes
--comment: figs:initial changeset for product_supersession_attribute
CREATE TABLE inventory_smart.product_supersession_attribute (
    ps_code int4 NOT NULL,
    attribute_name varchar NOT NULL,
    attribute_value varchar NULL,
    CONSTRAINT product_supersession_attribute_uk PRIMARY KEY (ps_code, attribute_name),
    CONSTRAINT product_supersession_attribute_ps_code_fkey FOREIGN KEY (ps_code) REFERENCES inventory_smart.product_supersession_mapping(ps_code) ON DELETE CASCADE
);