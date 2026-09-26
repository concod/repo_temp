--liquibase formatted sql
--changeset liquibase:product_mapping_product_dc_validated_table stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for product_mapping_product_dc_validated_table

-- DROP TABLE IF EXISTS global.product_mapping_product_dc_validated_table;
CREATE TABLE global.product_mapping_product_dc_validated_table (
	product_code varchar NOT NULL,
	l2_code varchar NULL,
	l0_code varchar NULL,
	l0_name varchar NULL,
	mapping_code int4 NULL,
	mapping_type varchar NULL,
	dc_code varchar NOT NULL,
	start_date date NULL,
	end_date date NULL,
	pm_active bool NULL,
	active bool NULL,
    CONSTRAINT product_mapping_product_dc_validated_pk PRIMARY KEY (product_code,dc_code)
);
