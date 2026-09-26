--liquibase formatted sql
--changeset swapnil.bhange:new_store_mapping stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for new_store_mapping
DROP TABLE IF EXISTS "global".new_store_mapping;

CREATE TABLE "global".new_store_mapping (
	store_code varchar NOT NULL,
	sister_store_code varchar NOT NULL,
	hierarchies jsonb NULL,
	CONSTRAINT new_store_mapping_pk PRIMARY KEY (store_code,sister_store_code)
);

--changeset swapnil.bhange:new_store_mapping_v2 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for new_store_mapping_v2
ALTER TABLE "global".new_store_mapping ADD COLUMN IF NOT EXISTS multiplier FLOAT;
ALTER TABLE "global".new_store_mapping ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT false;
