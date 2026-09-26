--liquibase formatted sql
--changeset ayushranjan.jha@impactanalytics.co:prompt_version stripComments:false splitStatements:false context:Release_1_0 labels:genai_table_addition
--comment: initial changeset for prompt_version


CREATE TABLE monday_smart.prompt_version (
	id serial4 NOT NULL,
	kpi_code_id int4 NULL,
	prompt text NULL,
	"version" varchar NULL,
	created_at timestamp DEFAULT CURRENT_TIMESTAMP NULL,
	updated_at timestamp DEFAULT CURRENT_TIMESTAMP NULL,
    query_string TEXT NULL,
	CONSTRAINT prompt_version_pkey PRIMARY KEY (id),
	CONSTRAINT prompt_version_kpi_code_id_fkey FOREIGN KEY (kpi_code_id) REFERENCES monday_smart.kpis_master_causal_v2(kpi_code)
);