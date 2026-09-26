--liquibase formatted sql
--changeset liquibase:intermediate_constraint_upload stripComments:false splitStatements:false context:MTP-34246 labels:MTP-34246
--comment: initial changeset for intermediate_constraint_upload
CREATE TABLE inventory_smart.intermediate_constraint_upload (
	product_code varchar NULL,
	article varchar NULL,
	store_code varchar NULL,
	min_stock float4 NULL,
	max_stock float4 NULL,
	wos float4 NULL,
	"size" varchar NULL,
	mapping_code varchar NULL,
	l0_name varchar NULL,
	updated_at timestamptz NULL,
	created_by text NULL,
	child_id text NULL
);

--changeset liquibase:intermediate_constraint_upload-2 stripComments:false splitStatements:false context:MTP-34246 labels:MTP-34246
--comment: add column for for intermediate_constraint_upload
ALTER TABLE inventory_smart.intermediate_constraint_upload add column if not exists file_id text NULL;

--changeset konakandla.sujan@impactanalytics.co:delete column stripComments:false splitStatements:false context:MTP-61008 labels:MTP-61008
--comment Add delete column
ALTER TABLE inventory_smart.intermediate_constraint_upload ADD "delete" float4 NULL;