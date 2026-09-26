--liquibase formatted sql
--changeset arnab.nandy@impactanalytics.co:gcs_sync_info stripComments:false splitStatements:false context:MTP-22867 labels:liquibase_project_start
--comment: creating table gcs_sync_info

CREATE TABLE "global".gcs_sync_info (
	bucket_name text NOT NULL,
	description text NULL,
	last_successful_sync_time timestamptz NOT NULL,
	CONSTRAINT gcs_sync_info_un UNIQUE (bucket_name)
);

--changeset kamalesh.k@impactanalytics.co:gcs_sync_info stripComments:false splitStatements:false context:MTP-22867 labels:liquibase_project_start
--comment: primary key for gcs_sync_info

ALTER TABLE "global".gcs_sync_info
DROP CONSTRAINT IF EXISTS gcs_sync_info_un;

ALTER TABLE "global".gcs_sync_info
ADD CONSTRAINT gcs_sync_info_pkey PRIMARY KEY (bucket_name);