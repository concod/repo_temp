--liquibase formatted sql
--changeset hemantkumar.bajaj:new_store_mapping stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for new_store_mapping
-- "global".new_store_mapping definition
-- Drop table
-- DROP TABLE "global".new_store_mapping;
CREATE TABLE IF NOT EXISTS "global".new_store_mapping (
    store_code varchar NOT NULL,
    sister_store_code varchar NOT NULL,
    hierarchies jsonb NULL,
    CONSTRAINT new_store_mapping_pk PRIMARY KEY (store_code, sister_store_code)
);

--changeset hemantkumar.bajaj:new_store_mapping_v2 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for new_store_mapping_v2
ALTER TABLE global.new_store_mapping ADD COLUMN IF NOT EXISTS multiplier float8 NULL;
ALTER TABLE global.new_store_mapping ADD COLUMN IF NOT EXISTS is_deleted bool DEFAULT false NULL;

--changeset manohara.gulla@impactanalytics.co:new_store_mapping_pk stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: changing primary key from (store_code, sister_store_code) to (store_code, sister_store_code, hierarchies)
ALTER TABLE "global".new_store_mapping ALTER COLUMN hierarchies SET NOT NULL;
ALTER TABLE "global".new_store_mapping ADD COLUMN hierarchies_hash uuid GENERATED ALWAYS AS (md5(hierarchies::text)::uuid) STORED;
ALTER TABLE "global".new_store_mapping DROP CONSTRAINT IF EXISTS new_store_mapping_pk;
ALTER TABLE "global".new_store_mapping ADD CONSTRAINT new_store_mapping_pk PRIMARY KEY (store_code, sister_store_code, hierarchies_hash);