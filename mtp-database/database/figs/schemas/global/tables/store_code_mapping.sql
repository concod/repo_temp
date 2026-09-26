--liquibase formatted sql
--changeset abhishek.sagar@impactanalytics.co:new_store_attributes_figs stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for new_store_attributes


CREATE TABLE IF NOT EXISTS "global".store_code_mapping (
	store_code varchar NOT NULL,
	dummy_store_code varchar NULL,
	status varchar(50) NULL,
	created_at timestamp DEFAULT now() NULL,
	updated_at timestamp DEFAULT now() NULL,
	CONSTRAINT store_code_mapping_pkey PRIMARY KEY (store_code)
);