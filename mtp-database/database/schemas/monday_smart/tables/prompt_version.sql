--liquibase formatted sql
--changeset liquibase:prompt_version_create stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for prompt_version_create

CREATE TABLE monday_smart.prompt_version (
	id serial4 NOT NULL,
	kpi_code_id int4 NULL,
	prompt text NULL,
	"version" varchar NULL,
	created_at timestamp DEFAULT CURRENT_TIMESTAMP NULL,
	updated_at timestamp DEFAULT CURRENT_TIMESTAMP NULL,
	CONSTRAINT prompt_version_pkey PRIMARY KEY (id),
	CONSTRAINT prompt_version_kpi_code_id_fkey FOREIGN KEY (kpi_code_id) REFERENCES monday_smart.kpis_master_causal_v2(kpi_code)
);

--changeset sivaprasath.vadivel@impactanalytics.co:prompt_version_update stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: adding the query string column for prompt version table

ALTER TABLE monday_smart.prompt_version ADD COLUMN IF NOT EXISTS query_string varchar NULL;
