--liquibase formatted sql
--changeset nischay.p@impactanalytics.co:rule_store_mapping stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_starts_rule_store_mapping
--comment: initial changeset for rule_store_mapping



CREATE TABLE "global".rule_store_mapping (
	module_code int4 NULL,
	rcl_dimension varchar NOT NULL,
	psa_code varchar NOT NULL,
	article varchar NULL,
	"size" varchar NULL,
	psa_name varchar NULL,
	start_date date NULL,
	end_date date NULL,
	mapping_type varchar NULL,
	rcl_lowest_level varchar NULL,
	rcl_code int4 NULL,
	action_type varchar NULL,
	CONSTRAINT pk_product_store_mapping PRIMARY KEY (rcl_dimension, psa_code)
);