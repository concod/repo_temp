--liquibase formatted sql
--changeset srinivasgowda.sg@impactanalytics.co:new_store_mapping stripComments:false splitStatements:false context:RELEASE_1_0_0 labels:JIRA_NO 
--comment adding new table 

CREATE TABLE "global".new_store_mapping (
    store_code varchar NOT NULL,
    sister_store_code varchar NOT NULL,
    hierarchies jsonb NULL,
    multiplier float
);

--changeset ashish@impactanalytics.co:new_store_mapping_pk stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for new_store_mapping_pk
ALTER TABLE "global".new_store_mapping ADD CONSTRAINT new_store_mapping_pk PRIMARY KEY (store_code,sister_store_code);