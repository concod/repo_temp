--liquibase formatted sql
--changeset liquibase:plan_attributes stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for plan_attributes
CREATE TABLE assort_smart.plan_attributes (
	plan_code int4 NOT NULL,
	attribute_name varchar NOT NULL,
	attribute_value varchar NOT NULL,
	CONSTRAINT assort_plan_attribute_name_lc_check CHECK (((attribute_name)::text = lower((attribute_name)::text))),
	CONSTRAINT plan_attributes_un UNIQUE (plan_code, attribute_name)
);