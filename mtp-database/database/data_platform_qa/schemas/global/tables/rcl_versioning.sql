--liquibase formatted sql
--changeset ashish:rcl_versioning stripComments:false splitStatements:false context:Release_2 labels:CI-137
--comment: initial changeset for rcl_versioning
CREATE TABLE "global".rcl_versioning (
	version_code serial4 NOT NULL,
	module_code int4 NOT NULL,
	created_at timestamptz DEFAULT now() NOT NULL,
	updated_at timestamptz NULL,
	CONSTRAINT rcl_versioning_pk PRIMARY KEY (version_code)
);
