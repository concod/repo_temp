--liquibase formatted sql
--changeset sriraj.varanasi@impactanalytics.co:qc_tb_cannibalization_coefficient_opt_generic_schema_mapping stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: create table qc_tb_cannibalization_coefficient_opt_generic_schema_mapping

CREATE TABLE "global".qc_tb_cannibalization_coefficient_opt_generic_schema_mapping (
	victim_brand text NOT NULL,
	cannibalizer_brand text NOT NULL,
	multiplier numeric NULL,
	min_value float8 NULL,
	max_value float8 NULL,
	CONSTRAINT qc_tb_cannibalization_coefficient_opt_generic_schema_mappingpkey PRIMARY KEY (victim_brand, cannibalizer_brand)
);