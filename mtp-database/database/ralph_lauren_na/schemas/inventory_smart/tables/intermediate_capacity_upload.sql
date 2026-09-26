
--liquibase formatted sql
--changeset liquibase:kailash stripComments:false splitStatements:false context:MTP-45251 labels:MTP-45251
--comment: store capacity upload
CREATE TABLE inventory_smart.intermediate_capacity_upload (
	product_hierarchy varchar NULL,
	store_code varchar NOT NULL,
	capacity float4 NULL,
	updated_at timestamptz NULL,
	updated_by int4 NULL,
	child_id text NULL,
	file_id text NULL
);

--changeset kailash:intermediate_capacity_upload stripComments:false splitStatements:false context:MTP-46876 labels:MTP-46876
--comment: mass delete MTP-46876
ALTER TABLE inventory_smart.intermediate_capacity_upload ADD "delete" float4 NULL;