--liquibase formatted sql
--changeset pooja.shekar@impactanalytics.co:new_store_mapping stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for new_store_mapping
CREATE TABLE "global".new_store_mapping (
    store_code varchar NOT NULL,
    sister_store_code varchar NOT NULL,
    hierarchies jsonb NULL
);


--changeset konakandla.sujan@impactanalytics.co:new_store_mapping_0_0_3 stripComments:false splitStatements:false context:RELEASE_1_0_4 labels:MTP-49460
--comment Add jsonb column  to store mapping_till_date and multiplier
ALTER TABLE "global".new_store_mapping ADD COLUMN other_attributes jsonb NULL;

--changeset ashish@impactanalytics.co:new_store_mapping_pk stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for new_store_mapping_pk
ALTER TABLE "global".new_store_mapping ADD CONSTRAINT new_store_mapping_pk PRIMARY KEY (store_code,sister_store_code);
