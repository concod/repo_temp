--liquibase formatted sql
--changeset harsh.singh@impactanalytics.co:filter_operator_master  stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for filter_operator_master

CREATE TABLE pricesmart.filter_operator_master (
	operation text NOT NULL,
	"operator" text NOT NULL,
	description text NULL,
	datatypes_allowed _text NULL,
	CONSTRAINT filter_operator_master_pkey PRIMARY KEY (operation)
);