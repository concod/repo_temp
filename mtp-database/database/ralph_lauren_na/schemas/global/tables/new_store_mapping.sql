--liquibase formatted sql
--changeset konakandla.sujan@impactanalytics.co:new_store_mapping stripComments:false splitStatements:false context:Release_1_0 labels:MTP-49460
--comment: initial changeset for new_store_mapping
CREATE TABLE IF NOT EXISTS  "global".new_store_mapping (
	store_code varchar NOT NULL,
	sister_store_code varchar NOT NULL,
	hierarchies jsonb NULL,
	other_attributes jsonb NULL
);

--changeset ashish@impactanalytics.co:new_store_mapping_pk stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for new_store_mapping_pk
ALTER TABLE "global".new_store_mapping ADD CONSTRAINT new_store_mapping_pk PRIMARY KEY (store_code,sister_store_code);