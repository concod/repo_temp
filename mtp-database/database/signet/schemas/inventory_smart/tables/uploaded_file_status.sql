--liquibase formatted sql
--changeset ananya.gupta@impactanalytics.co:inventory_smart.upload_file_status stripComments:false splitStatements:false context:Release_2_0 labels:inventory_smart.upload_file_status
--comment: create table statment for inventory_smart.upload_file_status
CREATE TABLE if not exists inventory_smart.uploaded_file_status (
	file_name text NULL,
	file_path text NULL,
	"status" int4 NULL,
	created_by varchar NULL,
	updated_at timestamptz NULL,
	id text NULL,
	screen text NULL,
    error_message text NULL
);