--liquibase formatted sql
--changeset liquibase:mail_notification_mapping stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for mail_notification_mapping
CREATE TABLE "global".mail_notification_mapping (
	tenant varchar NOT NULL,
	pipeline varchar NOT NULL,
	"type" varchar NOT NULL,
	subject varchar NOT NULL,
	recipients varchar NOT NULL,
	url varchar NOT NULL,
	CONSTRAINT pipeline_name_validate CHECK (((pipeline)::text ~ '^[a-zA-Z0-9]*$'::text)),
	CONSTRAINT tenant_name_validate CHECK (((tenant)::text ~ '^[a-zA-Z0-9]*$'::text))
);

--changeset hisham.mohammed@impactanalytics.co:mail_notification_mapping stripComments:false splitStatements:false context:DAT-899 labels:liquibase_project_start
--comment: initial changeset for mail_notification_mapping
ALTER TABLE "global".mail_notification_mapping drop CONSTRAINT tenant_name_validate ;
ALTER TABLE "global".mail_notification_mapping ADD CONSTRAINT tenant_name_validate CHECK (((tenant)::text ~ '^[a-zA-Z0-9-]*$'::text));

--changeset kamalesh.k:mail_notification_mapping stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: adding primary key to mail_notification_mapping table

ALTER TABLE global.mail_notification_mapping
Add column mail_notification_mapping_code serial4,
ADD CONSTRAINT mail_notification_mapping_pkey PRIMARY KEY (mail_notification_mapping_code);
