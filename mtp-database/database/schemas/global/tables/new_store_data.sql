--liquibase formatted sql
--changeset anshuman.ghosh@impactanalytics.co:new_store_data_0_0_1 stripComments:false splitStatements:false context:RELEASE_1_0_0 labels:JIRA_NO 
--comment Add comment describing your change 

-- "global".new_store_data definition

-- Drop table

-- DROP TABLE "global".new_store_data;

CREATE TABLE "global".new_store_data (
	store_code varchar NULL,
	store_name varchar NULL
);

--changeset konakandla.sujan@impactanalytics.co:new_store_data_0_0_3 stripComments:false splitStatements:false context:RELEASE_1_0_1 labels:MTP-49460 
--comment Add columns needed for new store flow
ALTER TABLE "global".new_store_data ADD COLUMN instore_date date NULL;
ALTER TABLE "global".new_store_data ADD COLUMN allocation_start_date date NULL;
ALTER TABLE "global".new_store_data ADD COLUMN is_store_created int2 DEFAULT 0 NULL;
ALTER TABLE "global".new_store_data ADD COLUMN store_groups _varchar NULL;

--changeset konakandla.sujan@impactanalytics.co:new_store_data_0_0_4 stripComments:false splitStatements:false context:RELEASE_1_0_2 labels:MTP-49460 
--comment Add additional columns needed for new store flow
ALTER TABLE "global".new_store_data ADD COLUMN created_at timestamptz NULL;
ALTER TABLE "global".new_store_data ADD COLUMN created_by int4 NULL;
ALTER TABLE "global".new_store_data ADD COLUMN updated_at timestamptz NULL;
ALTER TABLE "global".new_store_data ADD COLUMN updated_by int4 NULL;

--changeset konakandla.sujan@impactanalytics.co:new_store_data_0_0_5 stripComments:false splitStatements:false context:RELEASE_1_0_2 labels:MTP-49460 
--comment remove columns from new_store_data
ALTER TABLE "global".new_store_data DROP COLUMN instore_date;
ALTER TABLE "global".new_store_data DROP COLUMN allocation_start_date;
ALTER TABLE "global".new_store_data DROP COLUMN is_store_created;
ALTER TABLE "global".new_store_data DROP COLUMN store_groups;
ALTER TABLE "global".new_store_data DROP COLUMN created_at;
ALTER TABLE "global".new_store_data DROP COLUMN created_by;
ALTER TABLE "global".new_store_data DROP COLUMN updated_at;
ALTER TABLE "global".new_store_data DROP COLUMN updated_by;

--changeset pradeep.nayak@impactanalytics.co:new_store_data_v5 stripComments:false splitStatements:false context:GENERICNEWSTORE labels:generic-newstore
--comment: Adding store code as primary
ALTER TABLE "global".new_store_data ADD CONSTRAINT new_store_data_pk PRIMARY KEY (store_code);
