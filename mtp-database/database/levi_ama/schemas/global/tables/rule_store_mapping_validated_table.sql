--liquibase formatted sql
--changeset liquibase:rule_store_mapping_validated_table stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for rule_store_mapping_validated_table

-- DROP TABLE IF EXISTS global.rule_store_mapping_validated_table;
CREATE TABLE global.rule_store_mapping_validated_table (
	rcl_code int4 NULL,
	rcl_dimension varchar NOT NULL,
	psa_code varchar NOT NULL,
	psa_name varchar NULL,
	start_date date NULL,
	end_date date NULL,
	mapping_type varchar NULL,
	CONSTRAINT rule_store_mapping_validated_pk PRIMARY KEY (rcl_dimension, psa_code)
);