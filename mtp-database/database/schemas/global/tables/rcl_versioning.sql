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

--changeset shaik.azmathulla:rcl_versioning_v2 stripComments:false splitStatements:false context:Release_2 labels:DAT-1524
--comment: added tbl_name to global.rcl_versioning
ALTER TABLE global.rcl_versioning 
ADD column IF NOT EXISTS tbl_name character varying NOT NULL DEFAULT('global.rcl_versions_constraint');

--changeset ashish:rcl_versioning_deleted_at stripComments:false splitStatements:false context:Release_1_0 labels:DAT-1517
--comment: rcl_versioning_deleted_at
ALTER TABLE "global"."rcl_versioning" ADD deleted_at timestamptz NULL;
