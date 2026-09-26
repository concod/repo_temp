--liquibase formatted sql
--changeset liquibase:plan_wedge_opt_attribute stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for plan_wedge_opt_attribute
CREATE TABLE assort_smart.plan_wedge_opt_attribute (
	plan_code int4 NULL,
	levels jsonb NOT NULL,
	attribute_value varchar(200) NOT NULL,
	attribute_name varchar(200) NULL
);
CREATE INDEX plan_wedge_opt_attribute_plan_code_idx ON assort_smart.plan_wedge_opt_attribute USING btree (plan_code);