--liquibase formatted sql
--changeset liquibase:plan_finalize_grade_attribute stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for plan_finalize_grade_attribute
CREATE TABLE assort_smart.plan_finalize_grade_attribute (
	plan_finalize_grade_id int4 NULL,
	attribute_name varchar NOT NULL,
	attribute_value jsonb NOT NULL
);