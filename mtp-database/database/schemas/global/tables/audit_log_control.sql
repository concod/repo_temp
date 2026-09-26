--liquibase formatted sql
--changeset kailash.yadav@impactanalytics.co:audit_log_control stripComments:false splitStatements:false context:DAT-1124 labels:audit_log_control
--comment: initial changeset for audit_log_control
CREATE TABLE "global".audit_log_control (
	table_schema varchar NULL,
	table_name varchar NULL,
	audit_enable bool NOT NULL DEFAULT false,
	constraint  audit_log_control_un unique (table_schema,table_name)
);

--changeset kamalesh.k@impactanalytics.co:audit_log_control stripComments:false splitStatements:false context:DAT-1124 labels:audit_log_control
--comment: adding primary key for audit_log_control

ALTER TABLE "global".audit_log_control
DROP CONSTRAINT IF EXISTS audit_log_control_un;

ALTER TABLE "global".audit_log_control
ALTER COLUMN table_schema SET NOT NULL;

ALTER TABLE "global".audit_log_control
ALTER COLUMN table_name SET NOT NULL;

ALTER TABLE "global".audit_log_control
ADD CONSTRAINT audit_log_control_pkey PRIMARY KEY (table_schema, table_name);

