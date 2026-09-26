--liquibase formatted sql
--changeset liquibase:report_validation_master stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for report_validation_master
CREATE TABLE "global".upload_report_validation_master (
	validation_code serial4 NOT NULL,
	validation_name varchar NULL,
	validation_description varchar NULL,
	validation_config jsonb NULL,
	module_code int4 NULL,
	CONSTRAINT report_validation_master_pk PRIMARY KEY (validation_code)
);

ALTER TABLE "global".upload_report_validation_master ADD CONSTRAINT report_validation_master_fk FOREIGN KEY (module_code) REFERENCES "global".module_master(module_code);

--changeset shreyan.haldankar@impactanalytics.co:adding_column_column_name_mapping stripComments:false splitStatements:false context:Release_1_1 labels:MTP-41943
--comment: delta changeset for upload_report_validation_master-1
ALTER TABLE "global".upload_report_validation_master ADD COLUMN IF NOT EXISTS column_name_mapping jsonb NULL;