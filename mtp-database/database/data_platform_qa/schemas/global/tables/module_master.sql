--liquibase formatted sql
--changeset liquibase:module_master stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for module_master
CREATE TABLE "global".module_master (
	module_code serial4 NOT NULL,
	application_code int4 NOT NULL,
	screen_code int4 NOT NULL,
	module_name varchar NOT NULL
);
ALTER TABLE "global".module_master ADD CONSTRAINT module_master_application_fk FOREIGN KEY (application_code) REFERENCES "global".application_master(application_code);
ALTER TABLE "global".module_master ADD CONSTRAINT module_master_screen_fk FOREIGN KEY (screen_code) REFERENCES "global".screen_master(screen_code);

--changeset ashish@impactanalytics.co:module_master_pk stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: adding a pk on module_master
ALTER TABLE "global".module_master ADD CONSTRAINT module_master_pk PRIMARY KEY (module_code);

--changeset chaitanyaprasad:MTP-35116 stripComments:false splitStatements:false context:Release_1_1 labels:MTP-35116
--comment: adding level and dependant_modules columns
ALTER TABLE IF EXISTS "global".module_master
ADD COLUMN IF NOT EXISTS level INTEGER,
ADD COLUMN IF NOT EXISTS dependant_modules INTEGER[];
