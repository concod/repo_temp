--liquibase formatted sql
--changeset liquibase:sub_sku_dc_allocated_units stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for sub_sku_dc_allocated_units
CREATE TABLE IF NOT EXISTS inventory_smart.sub_sku_dc_allocated_units (
	product_code varchar NULL,
	dc_code varchar NULL,
	allocated_qty int4 NULL,
	allocation_plans _varchar NULL,
	last_updated timestamptz DEFAULT now() NULL,
	CONSTRAINT sub_sku_dc_allocated_units_unique UNIQUE (dc_code, product_code)
);

