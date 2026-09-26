--liquibase formatted sql
--changeset liquibase:tenant_application_screen_config stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for tenant_application_screen_config
CREATE TABLE "global".tenant_application_screen_config (
	tas_code serial4 NOT NULL,
	application_code int4 NOT NULL,
	"label" varchar NULL,
	config_name varchar NOT NULL,
	config_type varchar NOT NULL,
	config_value jsonb NULL,
	"level" varchar(11) NULL,
	is_mandatory bool NULL,
	is_apendable bool NULL,
	is_searchable varchar NULL,
	searchmetric varchar NULL,
	"type" varchar NULL,
	alignment varchar NULL,
	attribute_level varchar NULL,
	CONSTRAINT tenant_application_screen_config_pk PRIMARY KEY (tas_code)
);
