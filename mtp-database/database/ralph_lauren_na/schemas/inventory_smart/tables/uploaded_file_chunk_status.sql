--liquibase formatted sql
--changeset liquibase:uploaded_file_chunk_status stripComments:false splitStatements:false context:MTP-36168 labels:MTP-36168
--comment: MTP-36168-initial changeset for uploaded_file_chunk_status
CREATE TABLE inventory_smart.uploaded_file_chunk_status (
	parent_chunk_id text NULL,
	child_chunk_id text NULL,
	"status" int4 NULL,
	file_id text NULL,
	updated_at timestamptz NULL,
	created_at timestamptz NULL,
	created_by text NULL,
	screen text NULL
);