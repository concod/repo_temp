--liquibase formatted sql
--changeset bikrant.gupta@impactanalytics.co:new_store_mapping_0_0_1 stripComments:false splitStatements:false context:RELEASE_1_0_0 labels:JIRA_NO 
--comment Add comment describing your change 


CREATE TABLE IF NOT EXISTS "global".new_store_mapping (
	hierarchies jsonb NULL,
	store_code varchar NOT NULL,
	sister_store_code varchar NOT NULL
);

--changeset bikrant.gupta@impactanalytics.co@impactanalytics.co:new_store_mapping_0_0_2 stripComments:false splitStatements:false context:RELEASE_1_0_3 labels:JIRA_NO 
--comment Add COLUMN multiplier 
ALTER TABLE global.new_store_mapping ADD COLUMN if not exists multiplier FLOAT;

--changeset Piyush.kumar@impactanalytics.co:implement_soft_delete_new_store stripComments:false splitStatements:false context:Add_is_deleted_column labels:implement_soft_delete_new_store
--comment: insert is_deleted column for soft delete MTP-95506
ALTER TABLE global.new_store_mapping ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT false;


--changeset manohara.gulla@impactanalytics.co:new_store_mapping_pk stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: changing primary key from (store_code, sister_store_code) to (store_code, sister_store_code, hierarchies)
ALTER TABLE "global".new_store_mapping ALTER COLUMN hierarchies SET NOT NULL;
ALTER TABLE "global".new_store_mapping ADD COLUMN hierarchies_hash uuid GENERATED ALWAYS AS (md5(hierarchies::text)::uuid) STORED;
ALTER TABLE "global".new_store_mapping DROP CONSTRAINT IF EXISTS new_store_mapping_pk;
ALTER TABLE "global".new_store_mapping ADD CONSTRAINT new_store_mapping_pk PRIMARY KEY (store_code, sister_store_code, hierarchies_hash);
