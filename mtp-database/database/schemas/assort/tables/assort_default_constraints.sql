--liquibase formatted sql
--changeset liquibase:assort_default_constraints stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for assort_default_constraints
CREATE TABLE assort.assort_default_constraints (
	levels jsonb null,
	attribute_name varchar null,
	attribute_value jsonb null
);