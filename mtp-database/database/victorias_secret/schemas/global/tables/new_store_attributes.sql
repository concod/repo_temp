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

--changeset manohara.gulla@impactanalytics.co:new_store_attributes stripComments:false splitStatements:false context:VS_inv_smart labels:MTP-55016
--comment: Updated Schema based on requirement
ALTER TABLE "global".new_store_attributes ADD reservation_start_date date NULL ;

--changeset anujkumar.singh@impactanalytics.co:new_store_attributes_v3 stripComments:false splitStatements:false context:Victorias_Secret_InventorySmart labels:VS-403
--comment: Adding remodel store related columns
ALTER TABLE global.new_store_attributes ADD COLUMN IF NOT EXISTS effective_date DATE;
ALTER TABLE global.new_store_attributes ADD COLUMN IF NOT EXISTS temp_store_code VARCHAR;
ALTER TABLE global.new_store_attributes ADD COLUMN IF NOT EXISTS temp_opening_date DATE;
ALTER TABLE global.new_store_attributes ADD COLUMN IF NOT EXISTS temp_legacy_store_mapping_date DATE;
ALTER TABLE global.new_store_attributes ADD COLUMN IF NOT EXISTS temp_closing_date DATE;
ALTER TABLE global.new_store_attributes ADD COLUMN IF NOT EXISTS temp_effective_date DATE;
ALTER TABLE global.new_store_attributes ADD COLUMN IF NOT EXISTS legacy_store_code VARCHAR;
ALTER TABLE global.new_store_attributes ADD COLUMN IF NOT EXISTS legacy_closing_date DATE;
ALTER TABLE global.new_store_attributes ADD COLUMN IF NOT EXISTS remodel_flag BOOLEAN;

--changeset manohara.gulla@impactanalytics.co:new_store_attributes_v4 stripComments:false splitStatements:false context:Victorias_Secret_InventorySmart labels:VS-403
--comment: changing primarry key to composite key store_code and legacy_store_code
ALTER TABLE global.new_store_attributes DROP CONSTRAINT pk;

--changeset Piyush.kumar@impactanalytics.co:implement_soft_delete_new_store stripComments:false splitStatements:false context:Add_is_deleted_column labels:implement_soft_delete_new_store
--comment: insert is_deleted column for soft delete MTP-95506
ALTER TABLE global.new_store_attributes ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT false;

--changeset kamalesh.k@impactanalytics.co:new_store_attributes_v5 stripComments:false splitStatements:false context:Victorias_Secret_InventorySmart labels:VS-403
--comment: adding pk column 
ALTER TABLE global.new_store_attributes
add constraint new_store_attributes_pk primary key (store_code);

--changeset manohara.gulla@impactanalytics.co:new_store_attributes_v6 stripComments:false splitStatements:false context:Victorias_Secret_InventorySmart labels:VS-403
--comment: add store_opening_date_change column
ALTER TABLE "global".new_store_attributes ADD COLUMN IF NOT EXISTS store_opening_date_change date NULL;
