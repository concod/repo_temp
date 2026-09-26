--liquibase formatted sql
--changeset manohara.gulla@impactanalytics.co:new_store_attributes_V1 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for new_store_data
--DROP TABLE  if exists "global".new_store_data;
CREATE TABLE IF NOT EXISTS "global".new_store_data (
	store_code varchar NULL,
	store_name varchar NULL,
	instore_date date NULL,
	allocation_start_date date NULL,
	is_store_created int2 DEFAULT 0 NULL,
	store_groups _varchar NULL
);

--changeset manohara.gulla@impactanalytics.co:new_store_attributes_V2 stripComments:false splitStatements:false context:VS_inv_smart labels:MTP-55016
--comment: Updated Schema based on requirement
ALTER TABLE "global".new_store_data drop column if exists instore_date;
ALTER TABLE "global".new_store_data drop column if exists allocation_start_date;
ALTER TABLE "global".new_store_data drop column if exists is_store_created;
ALTER TABLE "global".new_store_data drop column if exists store_groups;

--changeset anujkumar.singh@impactanalytics.co:new_store_data_v3 stripComments:false splitStatements:false context:Victorias_Secret_InventorySmart labels:VS-403
--comment: Adding remodel flag
ALTER TABLE global.new_store_data ADD if not exists remodel_flag boolean NULL;

--changeset anujkumar.singh@impactanalytics.co:new_store_data_v4 stripComments:false splitStatements:false context:Victorias_Secret_InventorySmart labels:VS-403
--comment: Adding constraints
ALTER TABLE "global".new_store_data ADD CONSTRAINT new_store_data_pk PRIMARY KEY (store_code); 
