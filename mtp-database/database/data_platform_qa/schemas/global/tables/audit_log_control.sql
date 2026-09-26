--liquibase formatted sql
--changeset kailash.yadav@impactanalytics.co:audit_log_control stripComments:false splitStatements:false context:DAT-1124 labels:audit_log_control
--comment: initial changeset for audit_log_control
CREATE TABLE "global".audit_log_control (
	table_schema varchar NULL,
	table_name varchar NULL,
	audit_enable bool NOT NULL DEFAULT false,
	constraint  audit_log_control_un unique (table_schema,table_name)
);


