--liquibase formatted sql
--changeset liquibase:assort_wedge_request_constraints stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for assort_wedge_request_constraints
CREATE TABLE assort_smart.assort_wedge_request_constraints (
	request_id text NULL,
	attribute_value jsonb NULL
);