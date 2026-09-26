--liquibase formatted sql
--changeset liquibase:uploaded_file_status stripComments:false splitStatements:false context:MTP-36168 labels:MTP-36168
--comment: MTP-36168-initial changeset for uploaded_file_status
CREATE TABLE inventory_smart.uploaded_file_status (
	file_name text NULL,
	file_path text NULL,
	"status" int4 NULL,
	created_by varchar NULL,
	updated_at timestamptz NULL,
	id text NULL,
	screen text NULL,
    error_message text NULL
);