--liquibase formatted sql
--changeset liquibase:product_mapping_product_store stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for product_mapping_product_store
CREATE TABLE IF NOT EXISTS inventory_smart.product_mapping_product_store (
	mapping_code int4 NULL,
	mapping_type varchar(50) NULL,
	product_code int8 NULL,
	store_code varchar(50) NULL,
	is_active bool NULL,
	validity datemultirange NULL,
	l0_name varchar(50) NULL,
	created_at date NULL,
	created_by int4 NULL,
	updated_by int4 NULL,
	inv_source_flag int4 NULL,
	updated_at timestamptz NULL
);
