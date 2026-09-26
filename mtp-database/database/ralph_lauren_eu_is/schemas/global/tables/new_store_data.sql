--liquibase formatted sql
--changeset pooja.shekar@impactanalytics.co:new_store_data stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for new_store_data
CREATE TABLE "global".new_store_data (
    store_code varchar NULL,
    store_name varchar NULL
);


--changeset konakandla.sujan@impactanalytics.co:new_store_data_0_0_2 stripComments:false splitStatements:false context:RELEASE_1_0_1 labels:MTP-49460 
--comment Add columns needed for new store flow
ALTER TABLE "global".new_store_data ADD COLUMN instore_date date NULL;
ALTER TABLE "global".new_store_data ADD COLUMN allocation_start_date date NULL;
ALTER TABLE "global".new_store_data ADD COLUMN is_store_created int2 DEFAULT 0 NULL;
ALTER TABLE "global".new_store_data ADD COLUMN store_groups _varchar NULL;
ALTER TABLE "global".new_store_data ADD COLUMN created_at timestamptz NULL;
ALTER TABLE "global".new_store_data ADD COLUMN created_by int4 NULL;
ALTER TABLE "global".new_store_data ADD COLUMN updated_at timestamptz NULL;
ALTER TABLE "global".new_store_data ADD COLUMN updated_by int4 NULL;

--changeset anujkumar.singh@impactanalytics.co:new_store_data_v4 stripComments:false splitStatements:false context:Victorias_Secret_InventorySmart labels:VS-403
--comment: Adding constraints
ALTER TABLE "global".new_store_data ADD CONSTRAINT new_store_data_pk PRIMARY KEY (store_code);