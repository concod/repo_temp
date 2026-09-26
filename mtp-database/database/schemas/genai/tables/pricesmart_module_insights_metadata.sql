--liquibase formatted sql
--changeset biplab.malaklar@impactanalytics.co:pricesmart_module_insights_metadata_3 stripComments:false splitStatements:false context:Release_1_3 labels:liquibase_project_start
--comment: initial changeset for acl_master

CREATE TABLE IF NOT exists genai.pricesmart_module_insights_metadata (
	module_name varchar(255) NOT NULL,
	backend_table_names_list jsonb,
	ui_table_id jsonb,
	redis_index jsonb,
	sample_questions jsonb,
	status bool DEFAULT true NOT null,
	CONSTRAINT pricesmart_module_insights_metadata_pk PRIMARY KEY (module_name)
);

--changeset shannonnelson.d@impactanalytics.co:pricesmart_module_insights_metadata_1 stripComments:false splitStatements:false context:Release_2_1 labels:pricesmart_module_insights_metadata_1
--comment: added audit columns (created_by, created_at, updated_by, updated_at) and added default
ALTER TABLE genai.pricesmart_module_insights_metadata
ADD COLUMN IF NOT EXISTS created_by int4 NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now(),
ADD COLUMN IF NOT EXISTS updated_by int4 NULL,
ADD COLUMN IF NOT EXISTS updated_at timestamptz NULL;