--liquibase formatted sql
--changeset manohara.gulla@impactanalytics.co:new_store_mapping_V1 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for new_store_mapping
CREATE TABLE IF NOT EXISTS "global".new_store_mapping (
	store_code varchar NOT NULL,
	sister_store_code varchar NOT NULL,
	hierarchies jsonb NULL,
	other_attributes jsonb NULL
);

--changeset manohara.gulla@impactanalytics.co:new_store_mapping_V2 stripComments:false splitStatements:false context:MTP-54750 labels:MTP-54750
--comment: added updated_at and updated_by to dc_transit_time_mapping
ALTER TABLE global.new_store_mapping ADD COLUMN IF NOT EXISTS multiplier int4 NULL;

--changeset anujkumar.singh@impactanalytics.co:new_store_mapping_v3 stripComments:false splitStatements:false context:Victorias_Secret_InventorySmart labels:VS-403
--comment: Adding remodel store related columns
ALTER TABLE global.new_store_mapping ADD COLUMN IF NOT EXISTS temp_store_code VARCHAR;
ALTER TABLE global.new_store_mapping ADD COLUMN IF NOT EXISTS temp_hierarchies JSONB;
ALTER TABLE global.new_store_mapping ADD COLUMN IF NOT EXISTS temp_multiplier FLOAT4;
ALTER TABLE global.new_store_mapping ADD COLUMN IF NOT EXISTS remodel_flag BOOLEAN;

--changeset manohara.gulla@impactanalytics.co:new_store_mapping_V4 stripComments:false splitStatements:false context:MTP-54750 labels:MTP-54750
--comment: Change multiplier column type to FLOAT4
ALTER TABLE global.new_store_mapping ALTER COLUMN multiplier TYPE FLOAT4;

--changeset ashish@impactanalytics.co:new_store_mapping_pk stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for new_store_mapping_pk
ALTER TABLE "global".new_store_mapping ADD CONSTRAINT new_store_mapping_pk PRIMARY KEY (store_code,sister_store_code);

--changeset Piyush.kumar@impactanalytics.co:implement_soft_delete_new_store stripComments:false splitStatements:false context:Add_is_deleted_column labels:implement_soft_delete_new_store
--comment: insert is_deleted column for soft delete MTP-95506
ALTER TABLE global.new_store_mapping ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT false;

--changeset manohara.gulla@impactanalytics.co:new_store_mapping_pk stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: changing primary key from (store_code, sister_store_code) to (store_code, sister_store_code, hierarchies)
ALTER TABLE "global".new_store_mapping ALTER COLUMN hierarchies SET NOT NULL;
ALTER TABLE "global".new_store_mapping ADD COLUMN hierarchies_hash uuid GENERATED ALWAYS AS (md5(hierarchies::text)::uuid) STORED;
ALTER TABLE "global".new_store_mapping DROP CONSTRAINT new_store_mapping_pk;
ALTER TABLE "global".new_store_mapping ADD CONSTRAINT new_store_mapping_pk PRIMARY KEY (store_code, sister_store_code, hierarchies_hash);
