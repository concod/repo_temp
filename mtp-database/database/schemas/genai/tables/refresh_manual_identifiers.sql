--liquibase formatted sql
--changeset biplab.malaklar@impactanalytics.co:refresh_manual_identifiers stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for acl_master
CREATE TABLE IF NOT exists genai.refresh_manual_identifiers (
	id serial4 NOT NULL,
	"name" varchar NOT NULL,
	application_code int2 NOT NULL,
	is_deleted bool DEFAULT false NOT NULL,
	CONSTRAINT refresh_manual_identifiers_pk PRIMARY KEY (id),
	CONSTRAINT refresh_manual_identifiers_unique UNIQUE (name, application_code)
);