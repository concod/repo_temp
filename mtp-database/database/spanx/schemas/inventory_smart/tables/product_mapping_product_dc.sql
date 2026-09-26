--liquibase formatted sql
--changeset liquibase:product_dc stripComments:false splitStatements:false context:initial_release labels:liquibase_project_start
--comment: initial changeset for product_dc

CREATE TABLE inventory_smart.product_mapping_product_dc (
	mapping_code int4 NULL,
	mapping_type varchar(50) NULL,
	product_code varchar NULL,
	store_code varchar(50) NULL,
	dc_code varchar(50) NULL,
	is_active bool NULL,
	validity datemultirange NULL,
	l0_name varchar(50) NULL,
	created_at date NULL,
	updated_at timestamptz NULL,
	created_by varchar(50) NULL,
	updated_by varchar(50) NULL
);