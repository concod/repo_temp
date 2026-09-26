--liquibase formatted sql
--changeset liquibase:dc_inventory_generic_schema_mapping stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for dc_inventory_generic_schema_mapping

DROP TABLE IF EXISTS "global".new_store_mapping;

CREATE TABLE "global".new_store_mapping (
	store_code varchar NOT NULL,
	sister_store_code varchar NOT NULL,
	hierarchies jsonb NULL,
	multiplier float8 NULL
);
--changeset laraib@impactanalytics.co:new_store_mapping_pk stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for new_store_mapping_pk
ALTER TABLE "global".new_store_mapping ADD CONSTRAINT new_store_mapping_pk PRIMARY KEY (store_code,sister_store_code);
--changeset laraib.ahmad@impactanalytics.co:implement_soft_delete_new_store stripComments:false splitStatements:false context:Add_is_deleted_column labels:implement_soft_delete_new_store
--comment: sync the changes with CB
ALTER TABLE global.new_store_mapping ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT false;