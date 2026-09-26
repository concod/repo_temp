--liquibase formatted sql
--changeset liquibase:hindsight_plan_attributes stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for hindsight_plan_master
CREATE TABLE assort_smart.hindsight_plan_attributes (
	hindsight_plan_code int4 NOT NULL,
	attribute_name varchar NOT NULL,
	attribute_value varchar NOT NULL,
	CONSTRAINT hindsight_plan_attributes_name_lc_check CHECK (((attribute_name)::text = lower((attribute_name)::text))),
	CONSTRAINT hindsight_plan_attributes_un UNIQUE (hindsight_plan_code, attribute_name)
);