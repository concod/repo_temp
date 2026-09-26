--liquibase formatted sql
--changeset liquibase:product_hierarchies stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for product_hierarchies
CREATE TABLE global.product_hierarchies (
    product_code character varying NOT NULL,
    hierarcy_name character varying NOT NULL,
    hierarcy_value json DEFAULT '{}'::json NOT NULL
);
ALTER TABLE global.product_hierarchies
    ADD CONSTRAINT product_hierarchies_fk FOREIGN KEY (product_code) REFERENCES global.product_master(product_code) ON DELETE CASCADE;

--changeset ashish:product_hierarchies_pk stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: changeset for product_hierarchies_pk
ALTER TABLE "global".product_hierarchies ADD CONSTRAINT product_hierarchies_pk PRIMARY KEY (product_code,hierarcy_name);
