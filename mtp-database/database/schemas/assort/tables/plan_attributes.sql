--liquibase formatted sql
--changeset liquibase:plan_attributes stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for plan_attributes
CREATE TABLE assort.plan_attributes (
    plan_code integer NOT NULL,
    attribute_name character varying NOT NULL,
    attribute_value character varying NOT NULL,
    CONSTRAINT assort_plan_attribute_name_lc_check CHECK (((attribute_name)::text = lower((attribute_name)::text)))
);
ALTER TABLE assort.plan_attributes
    ADD CONSTRAINT plan_attributes_un UNIQUE (plan_code, attribute_name);
ALTER TABLE assort.plan_attributes
    ADD CONSTRAINT assort_plan_attributes_fk FOREIGN KEY (plan_code) REFERENCES assort.plan_master(plan_code) ON DELETE CASCADE;
