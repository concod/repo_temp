-- liquibase formatted sql
-- changeset aman.lakkoju:lms_attributes stripComments:false splitStatements:false context: db_sync labels:lms_attributes
-- comment: initial changeset for lms_attributes
CREATE TABLE inventory_smart.lms_attributes (
    primary_trait_desc varchar NULL,
    l3_name varchar NULL,
    article varchar NULL,
    store_code varchar NULL,
    lms_attributes text NULL,
    lms_attribute_value text NULL,
    CONSTRAINT lms_attribute_pk PRIMARY KEY (primary_trait_desc, l3_name, article, store_code)
);

CREATE INDEX idx_lms_attributes_primary_trait_l3_article
ON inventory_smart.lms_attributes (primary_trait_desc, l3_name, article);