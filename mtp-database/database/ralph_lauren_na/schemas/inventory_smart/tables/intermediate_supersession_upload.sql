--liquibase formatted sql
--changeset liquibase:karthikeswar stripComments:false splitStatements:false context:MTP-46877
--comment: store capacity upload
CREATE TABLE inventory_smart.intermediate_supersession_upload (
	new_article varchar NULL,
	new_size varchar NULL,
	old_article varchar NULL,
	old_size varchar NULL,
	priority int4 NULL,
	start_date date NULL,
	"delete" int4 NULL,
	updated_at timestamptz NULL,
	updated_by int4 NULL
);
--changeset saad.adeeb:change_column_name_for_bsync stripComments:false splitStatements:false context:MTP-46877
--comment: change_column_name_for_bsync
ALTER TABLE inventory_smart.intermediate_supersession_upload RENAME COLUMN "delete" TO is_deleted;