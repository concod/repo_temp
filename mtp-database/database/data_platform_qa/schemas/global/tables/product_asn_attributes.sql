--liquibase formatted sql
--changeset liquibase:product_asn_attributes stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for product_asn_attributes
CREATE TABLE global.product_asn_attributes (
    pasn_code integer NOT NULL,
    attribute_name character varying NOT NULL,
    attribute_value character varying NOT NULL
);
ALTER TABLE global.product_asn_attributes
    ADD CONSTRAINT product_asn_attributes_fk FOREIGN KEY (pasn_code) REFERENCES global.product_asn_master(pasn_code) ON DELETE CASCADE;
