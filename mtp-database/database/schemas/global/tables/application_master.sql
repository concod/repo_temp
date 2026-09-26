--liquibase formatted sql
--changeset liquibase:application_master stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for application_master
CREATE TABLE "global".application_master (
	application_code serial4 NOT NULL,
	"name" varchar NULL,
	description varchar NULL,
	"version" varchar NULL,
	icon varchar NULL,
	status bool NULL,
	attribute_code _int4 NULL,
	CONSTRAINT application_master_pk PRIMARY KEY (application_code)
);

--changeset raj.mohan@impactanalytics.co:application_master stripComments:false splitStatements:false context:Release_1_2 labels:application_master remove column
--comment: Dropping attribute_code from application_master as its not used in any cases
ALTER TABLE "global".application_master DROP COLUMN attribute_code;

--changeset chaitanyaprasad.reddy:MTP-42719 stripComments:false splitStatements:false context:Release_1_3 labels:MTP-42719
--comment: Adding a new extra column for application_master
ALTER TABLE "global".application_master ADD COLUMN extra JSONB;