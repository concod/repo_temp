--liquibase formatted sql
--changeset liquibase:assort_default_constraints stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for assort_default_constraints
CREATE TABLE assort_smart.assort_default_constraints (
	levels jsonb NULL,
	attribute_name varchar NULL,
	attribute_value jsonb NULL
);