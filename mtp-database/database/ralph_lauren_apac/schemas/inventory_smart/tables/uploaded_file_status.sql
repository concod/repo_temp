--liquibase formatted sql
--changeset liquibase:uploaded_file_status stripComments:false splitStatements:false context:MTP-34246 labels:MTP-34246
--comment: initial changeset for uploaded_file_status
CREATE TABLE inventory_smart.uploaded_file_status (
	file_name text NULL,
	file_path text NULL,
	"status" int4 NULL,
	created_by varchar NULL,
	updated_at timestamptz NULL,
	id text NULL,
	screen text NULL
);


--changeset ajunravi:new_column_added stripComments:false splitStatements:false context:Ralph_Lauren_InventorySmart labels: MTP-34236
--comment: new column added for storing errors
ALTER TABLE inventory_smart.uploaded_file_status ADD COLUMN error_message TEXT DEFAULT NULL;

