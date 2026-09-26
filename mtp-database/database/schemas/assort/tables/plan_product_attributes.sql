--liquibase formatted sql
--changeset liquibase:plan_product_attributes stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for plan_product_attributes
CREATE TABLE assort.plan_product_attributes (
    plan_code integer NOT NULL,
    levels jsonb NOT NULL,
    attribute_name character varying NOT NULL,
    is_primary boolean NOT NULL,
    is_final boolean DEFAULT false NOT NULL
);
ALTER TABLE assort.plan_product_attributes
    ADD CONSTRAINT plan_product_attributes_fk FOREIGN KEY (plan_code) REFERENCES assort.plan_master(plan_code) ON DELETE CASCADE;
