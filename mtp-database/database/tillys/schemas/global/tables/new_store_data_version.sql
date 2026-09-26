--liquibase formatted sql
--changeset gauri.nair@impactanalytics.co:new_store_data_version stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_starts
--comment: initial changeset for new_store_data_version

CREATE TABLE "global".new_store_data_version (
	version_code int4 NOT NULL,
	store_code varchar NOT NULL,
	store_name varchar NULL,
	CONSTRAINT new_store_data_version_un PRIMARY KEY (version_code, store_code),
	CONSTRAINT new_store_data_version_fk FOREIGN KEY (version_code) REFERENCES "global"."versioning"(version_code) ON DELETE CASCADE
)
PARTITION BY LIST (version_code);