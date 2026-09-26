--liquibase formatted sql
--changeset liquibase:intermediate_constraint_upload stripComments:false splitStatements:false context:MTP-36168 labels:MTP-36168
--comment: MTP-36168-initial changeset for intermediate_constraint_upload
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
	child_id text NULL,
    file_id text NULL
);

--changeset kailash:intermediate_constraint_upload stripComments:false splitStatements:false context:MTP-46876 labels:MTP-46876
--comment: mass delete MTP-46876
ALTER TABLE inventory_smart.intermediate_constraint_upload ADD "delete" float4 NULL;
