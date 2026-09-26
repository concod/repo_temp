
--liquibase formatted sql
--changeset sriraj.varanasi@impactanalytics.co:qc_tb_pullforward_coefficient_opt_generic_schema_mapping stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: create table qc_tb_pullforward_coefficient_opt_generic_schema_mapping

CREATE TABLE "global".qc_tb_pullforward_coefficient_opt_generic_schema_mapping (
	product_id int4 NOT NULL,
	lag_week_number int4 NOT NULL,
	multiplier numeric NULL,
	CONSTRAINT qc_tb_pullforward_coefficient_opt_generic_schema_mapping_pkey PRIMARY KEY (product_id, lag_week_number)
);
