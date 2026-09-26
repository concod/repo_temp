
--liquibase formatted sql
--changeset abhishek.singh@impactanalytics.co:bp_exception_types_v2 stripComments:false splitStatements:false context:Release_1_0 labels: liquibase_project_start
--comment: changeset for base_pricing.bp_exception_types_v2

CREATE TABLE base_pricing.bp_exception_types (
	exception_id int4 NOT NULL,
	exception_types varchar NULL,
	CONSTRAINT bp_exception_types_pkey PRIMARY KEY (exception_id)
);