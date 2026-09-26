--liquibase formatted sql
--changeset ananya.gupta@impactanalytics.co:inventory_smart.upload_file_chunk_status stripComments:false splitStatements:false context:Release_2_0 labels:inventory_smart.upload_file_chunk_status
--comment: create table statment for inventory_smart.upload_file_chunk_status
CREATE TABLE if not exists inventory_smart.uploaded_file_chunk_status (
	parent_chunk_id text NULL,
	child_chunk_id text NULL,
	"status" int4 NULL,
	file_id text NULL,
	updated_at timestamptz NULL,
	created_at timestamptz NULL,
	created_by text NULL,
	screen text NULL
);
