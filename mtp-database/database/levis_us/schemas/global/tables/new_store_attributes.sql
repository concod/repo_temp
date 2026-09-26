--liquibase formatted sql
--changeset aniruddh.singh@impactanalytics.co:new_store_attributes stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for new_store_attributes
CREATE TABLE if NOT exists "global".new_store_attributes (
	store_code varchar NOT NULL,
	opening_date date NULL,
	sister_store_mapping_date date NULL,
	store_group_mapping_date date NULL,
	store_groups _varchar DEFAULT ARRAY[]::character varying[] NULL,
	CONSTRAINT pk PRIMARY KEY (store_code)
);
CREATE INDEX new_store_attributes_indx1 ON global.new_store_attributes USING btree (store_code);

--changeset bikrant.gupta@impactanalytics.co:new_store_attributes stripComments:false splitStatements:false context:Release_1_0 labels:new column
--comment: added new column for status
ALTER TABLE global.new_store_attributes ADD COLUMN status INT;

--changeset Piyush.kumar@impactanalytics.co:implement_soft_delete_new_store stripComments:false splitStatements:false context:Add_is_deleted_column labels:implement_soft_delete_new_store
--comment: insert is_deleted column for soft delete MTP-95506
ALTER TABLE global.new_store_attributes ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT false;