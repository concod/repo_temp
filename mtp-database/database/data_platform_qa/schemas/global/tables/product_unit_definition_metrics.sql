--liquibase formatted sql
--changeset liquibase:product_unit_definition_metrics stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for product_unit_definition_metrics
CREATE TABLE global.product_unit_definition_metrics (
    pud_code integer NOT NULL,
    size character varying NOT NULL,
    color character varying NOT NULL,
    value double precision NOT NULL,
    product_code character varying NOT NULL
);
ALTER TABLE global.product_unit_definition_metrics
    ADD CONSTRAINT product_unit_definition_metrics_un UNIQUE (pud_code, product_code);
ALTER TABLE global.product_unit_definition_metrics
    ADD CONSTRAINT product_unit_defination_metrics_fk FOREIGN KEY (pud_code) REFERENCES global.product_unit_definitions(pud_code) ON DELETE CASCADE;
ALTER TABLE global.product_unit_definition_metrics
    ADD CONSTRAINT product_unit_definition_metrics_fk FOREIGN KEY (product_code) REFERENCES global.product_master(product_code) ON DELETE CASCADE;
