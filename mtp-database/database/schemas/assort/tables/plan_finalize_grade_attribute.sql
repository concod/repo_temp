--liquibase formatted sql
--changeset liquibase:plan_finalize_grade_attribute stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for plan_finalize_grade_attribute
CREATE TABLE assort.plan_finalize_grade_attribute (
    plan_finalize_grade_id integer,
    attribute_name character varying NOT NULL,
    attribute_value jsonb NOT NULL
);
ALTER TABLE assort.plan_finalize_grade_attribute
    ADD CONSTRAINT plan_finalize_grade_attribute_fk FOREIGN KEY (plan_finalize_grade_id) REFERENCES assort.plan_finalize_grade_master(plan_finalize_grade_id) ON UPDATE SET NULL ON DELETE CASCADE;
