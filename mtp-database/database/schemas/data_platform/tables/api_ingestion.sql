--liquibase formatted sql
--changeset himani.sharma@impactanalytics.co:api_ingestion_checkpoint stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial table creation for api_ingestion

CREATE TABLE IF NOT EXISTS data_platform.api_ingestion_checkpoint (
	job_id serial4 NOT NULL,
	status text NULL,
	file_name text ,
	file_gcs_path text NULL,
	schema_gcs_path text NULL,
	file_attributes json NULL,
	dataset_id text ,
	destination_table_name text ,
	created_by int4,
	created_at timestamp,
	last_run_by int4 NULL,
	last_run_time timestamp NULL,
	CONSTRAINT api_ingestion_job_id_pk PRIMARY KEY (job_id,status)
)PARTITION BY LIST (status);

CREATE INDEX IF NOT EXISTS idx_api_ingestion_file_name ON data_platform.api_ingestion_checkpoint (file_name);
CREATE INDEX IF NOT EXISTS idx_api_ingestion_creator_code ON data_platform.api_ingestion_checkpoint (created_by);
CREATE INDEX IF NOT EXISTS idx_api_ingestion_updator_code ON data_platform.api_ingestion_checkpoint (last_run_by);
CREATE INDEX IF NOT EXISTS idx_api_ingestion_last_run_time ON data_platform.api_ingestion_checkpoint (last_run_time);


CREATE TABLE IF NOT EXISTS api_ingestion_checkpoint_file_staged PARTITION OF data_platform.api_ingestion_checkpoint
FOR VALUES IN ('FILE-STAGED');

CREATE TABLE IF NOT EXISTS api_ingestion_checkpoint_validated PARTITION OF data_platform.api_ingestion_checkpoint
FOR VALUES IN ('VALIDATED');

CREATE TABLE IF NOT EXISTS api_ingestion_checkpoint_completed PARTITION OF data_platform.api_ingestion_checkpoint
FOR VALUES IN ('COMPLETED');


--changeset himani.sharma@impactanalytics.co:api_ingestion_checkpoint_2 stripComments:false splitStatements:false context:Release_1_1 labels:error_handling
--comment: error_handling
ALTER TABLE  data_platform.api_ingestion_checkpoint ADD COLUMN IF NOT EXISTS error_msg text NULL;

--changeset himani.sharma@impactanalytics.co:api_ingestion_checkpoint_4 stripComments:false splitStatements:false context:Release_1_2 labels:partition_creation_for_failed
--comment: partition_creation_for_failed

CREATE TABLE IF NOT EXISTS api_ingestion_checkpoint_failed PARTITION OF data_platform.api_ingestion_checkpoint
FOR VALUES IN ('FAILED');
