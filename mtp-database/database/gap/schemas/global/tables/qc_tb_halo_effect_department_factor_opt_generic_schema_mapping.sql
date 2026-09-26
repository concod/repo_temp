--liquibase formatted sql
--changeset sriraj.varanasi@impactanalytics.co:qc_tb_halo_effect_department_factor_opt_generic_schema_mapping stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: create table qc_tb_halo_effect_department_factor_opt_generic_schema_mapping

CREATE TABLE "global".qc_tb_halo_effect_department_factor_opt_generic_schema_mapping (
	product_id int4 NOT NULL,
	sub_dept varchar NOT NULL,
	multiplier numeric NULL,
	min_value float NULL,
	max_value float NULL,
	CONSTRAINT qc_tb_halo_effect_department_factor_opt_generic_schema_mapping_pkey PRIMARY KEY (product_id, sub_dept)
);
