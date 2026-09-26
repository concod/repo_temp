--liquibase formatted sql
--changeset liquibase:plan_performance_attributes stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for plan_performance_attributes
CREATE TABLE assort.plan_performance_attributes (
    plan_code integer NOT NULL,
    levels jsonb NOT NULL,
    attribute_name character varying NOT NULL,
    score real NOT NULL,
    rank smallint NOT NULL,
    is_final boolean DEFAULT false NOT NULL
);
ALTER TABLE assort.plan_performance_attributes
    ADD CONSTRAINT plan_performance_attributes_fk FOREIGN KEY (plan_code) REFERENCES assort.plan_master(plan_code) ON DELETE CASCADE;
