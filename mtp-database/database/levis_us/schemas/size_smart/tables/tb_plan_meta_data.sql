-- liquibase formatted sql
-- changeset akashkumar.rana@impactanalytics.co:tb_plan_meta_data_modifications stripComments:false splitStatements:false context:FINAL-SIZE-SMART-SCHEMA-MODIFICATIONS labels:FINAL-SIZE-SMART-SCHEMA-MODIFICATIONS 
-- comment: initial changeset for tb_plan_meta_data

CREATE TABLE  size_smart.tb_plan_meta_data (
	id serial4 NOT NULL,
	plan_code int4 NOT NULL,
	total_sc numeric NULL,
	completed_sc numeric NULL,
	total_bu numeric NULL,
	completed_bu numeric NULL,
	created_at timestamptz DEFAULT CURRENT_TIMESTAMP NULL,
	updated_at timestamptz DEFAULT CURRENT_TIMESTAMP NULL,
	CONSTRAINT tb_plan_meta_data_pkey PRIMARY KEY (id)
);

CREATE INDEX  idx_tb_plan_meta_data_plan_code 
ON size_smart.tb_plan_meta_data USING btree (plan_code);