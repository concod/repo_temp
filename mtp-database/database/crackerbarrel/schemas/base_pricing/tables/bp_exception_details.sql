--liquibase formatted sql
--changeset abhishek.singh@impactanalytics.co:bp_exception_details stripComments:false splitStatements:false context:Release_1_0 labels: liquibase_project_start
--comment: changeset for base_pricing.bp_exception_details

CREATE TABLE base_pricing.bp_exception_details (
	exception_details_id int4 NOT NULL,
	exception_type_id int4 NULL,
	strategy_id int8 NULL,
	product_id int8 NULL,
	rule_id int8 NULL,
	exception_desc varchar NULL,
	CONSTRAINT bp_exception_details_pkey PRIMARY KEY (exception_details_id)
);