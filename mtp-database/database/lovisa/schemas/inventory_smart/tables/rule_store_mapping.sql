--liquibase formatted sql
--changeset aleena.reji:rule_store_mapping stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for rule_store_mapping
-- DROP TABLE inventory_smart.rule_store_mapping;

CREATE TABLE IF NOT EXISTS inventory_smart.rule_store_mapping (
	rcl_code int4 NULL,
	module_code int4 NULL,
	rcl_dimension varchar NOT NULL,
	"size" varchar NULL,
	psa_code varchar NOT NULL,
	article varchar NULL,
	psa_name varchar NULL,
	start_date date NULL,
	end_date date NULL,
	mapping_type varchar NULL,
	rcl_lowest_level varchar NULL,
	CONSTRAINT rule_store_mapping_pk PRIMARY KEY (rcl_dimension, psa_code)
);