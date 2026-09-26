--liquibase formatted sql
--changeset anshuman.ghosh@impactanalytics.co:new_store_mapping_0_0_1 stripComments:false splitStatements:false context:RELEASE_1_0_0 labels:JIRA_NO 
--comment Add comment describing your change 

-- "global".new_store_mapping definition

-- Drop table

-- DROP TABLE "global".new_store_mapping;

CREATE TABLE "global".new_store_mapping (
	hierarchies _varchar NOT NULL,
	store_code varchar NOT NULL,
	sister_store_code varchar NOT NULL
);

--rollback TYPE YOUR ROLLBACK IF POSSIBLE OR TYPE SELECT 1 ;

--liquibase formatted sql
--changeset anshuman.ghosh@impactanalytics.co:new_store_mapping_0_0_2 stripComments:false splitStatements:false context:RELEASE_1_0_3 labels:JIRA_NO 
--comment Add comment describing your change 

ALTER TABLE "global".new_store_mapping DROP COLUMN hierarchies;
ALTER TABLE "global".new_store_mapping ADD hierarchies jsonb NULL;


--changeset konakandla.sujan@impactanalytics.co:new_store_mapping_0_0_4 stripComments:false splitStatements:false context:RELEASE_1_0_4 labels:MTP-49460
--comment Add jsonb column  to store mapping_till_date and multiplier
ALTER TABLE "global".new_store_mapping ADD COLUMN other_attributes jsonb NULL;


--changeset konakandla.sujan@impactanalytics.co:new_store_mapping_0_0_5 stripComments:false splitStatements:false context:RELEASE_1_0_5 labels:MTP-49460
--comment remove column
ALTER TABLE "global".new_store_mapping DROP COLUMN other_attributes;
--rollback TYPE YOUR ROLLBACK IF POSSIBLE OR TYPE SELECT 1 ;
