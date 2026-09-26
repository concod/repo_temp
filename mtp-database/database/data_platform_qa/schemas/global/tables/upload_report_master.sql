--changeset linu.nazil:report_master_v2 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for report_master
drop SEQUENCE if exists global.report_master_code_seq;
--liquibase formatted sql
--changeset liquibase:report_master stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for report_master
CREATE TABLE if not exists "global".upload_report_master (
	report_code serial4 NOT NULL,
	status int4 NULL,
	validation_code int4 NULL,
	url varchar NULL,
	created_at timestamptz NOT NULL DEFAULT now(),
	updated_at timestamptz NOT NULL DEFAULT now(),
	created_by int4 NULL,
	updated_by int4 NULL,
	report_info jsonb NULL,
	file_name varchar NULL,
	CONSTRAINT report_master_pk PRIMARY KEY (report_code),
	CONSTRAINT upload_report_master_un UNIQUE (created_by, file_name)
);

--changeset linu.nazil:report_master_v1 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for report_master
ALTER TABLE "global".upload_report_master drop CONSTRAINT if exists report_master_fk;
ALTER TABLE "global".upload_report_master ADD CONSTRAINT report_master_fk FOREIGN KEY (validation_code) REFERENCES "global".upload_report_validation_master(validation_code);


--changeset anoop.madamsetty@impactanalytics.co:drop_constraint stripComments:false splitStatements:false context:Release_1_1 labels:MTP-39963
--comment: drop unique constraint of created_by and file_name
ALTER TABLE "global".upload_report_master DROP CONSTRAINT if exists upload_report_master_un;
