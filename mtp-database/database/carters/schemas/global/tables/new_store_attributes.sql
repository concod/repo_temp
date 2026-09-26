--liquibase formatted sql
--changeset aniruddh.singh@impactanalytics.co:new_store_attributes_v1 stripComments:false splitStatements:false context:Release_1_1 labels:rename column store_group to store_groups
--comment: rename column store_group to store_groups for new_store_attributes

CREATE TABLE IF NOT EXISTS "global".new_store_attributes (
    store_code VARCHAR NOT NULL,
    opening_date DATE NULL,
    sister_store_mapping_date DATE NULL,
    store_group_mapping_date DATE NULL,
    store_group VARCHAR[] DEFAULT ARRAY[]::VARCHAR[],
    CONSTRAINT pk PRIMARY KEY (store_code)
);

CREATE INDEX new_store_attributes_indx1 ON "global".new_store_attributes USING btree (store_code);

--changeset aniruddh.singh@impactanalytics.co:new_store_attributes stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: add rename column store_group to store_groups if it exist 
ALTER TABLE "global".new_store_attributes RENAME COLUMN store_group TO store_groups;

--changeset manohara.gulla@impactanalytics.co:new_store_attributes stripComments:false splitStatements:false context:reservation_date is need for CB  labels:MTP-55016
--comment: Updated Schema based on requirement of reservation date
ALTER TABLE "global".new_store_attributes ADD reservation_date date NULL ;

--changeset aman.lakkoju@impactanalytics.co:implement_soft_delete_new_store stripComments:false splitStatements:false context:Add_is_deleted_column labels:implement_soft_delete_new_store
--comment: added is deleted column
ALTER TABLE global.new_store_attributes ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT false;

