--liquibase formatted sql
--changeset liquibase:product_mapping_store_dc_validated_table stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for product_mapping_store_dc_validated_table

-- DROP TABLE IF EXISTS global.product_mapping_store_dc_validated_table;
CREATE TABLE global.product_mapping_store_dc_validated_table (
	dc_code varchar NOT NULL,
	dc_channel varchar NULL,
	store_code varchar NOT NULL,
	store_channel varchar NULL,
	start_date date NULL,
	end_date date NULL,
	is_active bool NULL,
	CONSTRAINT product_mapping_store_dc_validated_pk PRIMARY KEY (store_code, dc_code)
);