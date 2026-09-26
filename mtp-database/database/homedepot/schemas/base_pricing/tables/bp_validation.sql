
--liquibase formatted sql
--changeset abhishek.singh@impactanalytics.co:bp_validation_v2 stripComments:false splitStatements:false context:Release_1_0 labels: liquibase_project_start
--comment: changeset for base_pricing.bp_validation_v2

CREATE SEQUENCE if not exists base_pricing.bp_validation_rules_validation_id_seq;
CREATE TABLE base_pricing.bp_validation (
	validation_id int4 DEFAULT nextval('base_pricing.bp_validation_rules_validation_id_seq'::regclass) NOT NULL,
	validation_code varchar(50) NOT NULL,
	validation_name varchar(100) NOT NULL,
	validation_params jsonb NULL,
	CONSTRAINT bp_validation_rules_pkey PRIMARY KEY (validation_id),
	CONSTRAINT bp_validation_rules_validation_code_key UNIQUE (validation_code)
);