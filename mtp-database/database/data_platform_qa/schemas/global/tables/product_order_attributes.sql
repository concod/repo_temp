--liquibase formatted sql
--changeset liquibase:product_order_attributes stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for product_order_attributes
CREATE TABLE global.product_order_attributes (
    po_code integer NOT NULL,
    attribute_name character varying NOT NULL,
    attribute_value character varying NOT NULL
);
ALTER TABLE global.product_order_attributes
    ADD CONSTRAINT product_order_attributes_fk FOREIGN KEY (po_code) REFERENCES global.product_order_master(po_code) ON DELETE CASCADE;
