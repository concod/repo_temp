--liquibase formatted sql
--changeset arshad.k@impactanalytics.co:tenant_attribute_master stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for tenant_attribute_master

CREATE TABLE "global".tenant_attribute_master (
	attribute_code serial4 NOT NULL,
	"name" varchar NULL,
	attribute_type varchar NULL,
	description varchar NULL,
	status bool NULL,
	attribute_value jsonb NULL,
	application_code int4 NULL,
	user_edited bool DEFAULT false NULL,
	module_code int4 NULL,
	CONSTRAINT attributes_master_pk PRIMARY KEY (attribute_code),
	CONSTRAINT tenant_attribute_master_un UNIQUE (name, attribute_type, application_code)
);


-- "global".tenant_attribute_master foreign keys

ALTER TABLE "global".tenant_attribute_master ADD CONSTRAINT tenant_attribute_module_fk FOREIGN KEY (module_code) REFERENCES "global".module_master(module_code);