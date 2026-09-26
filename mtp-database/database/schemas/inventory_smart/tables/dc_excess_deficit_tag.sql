--liquibase formatted sql
--changeset liquibase:dc_excess_deficit_tag stripComments:false splitStatements:false context:Release_1_0 labels:VS-553
--comment: initial changeset for dc_excess_deficit_tag
CREATE TABLE IF NOT EXISTS inventory_smart.dc_excess_deficit_tag (
	product_code varchar NULL,
	dc_code int4 NULL,
	deficit_excess_units float8 NULL,
	tag text NULL,
	total_allocations float8 NULL,
	sales_forecast float8 NULL,
	CONSTRAINT dc_excess_deficit_tag_unique UNIQUE (product_code, dc_code),
	CONSTRAINT dc_excess_deficit_tag_dc_code FOREIGN KEY (dc_code) REFERENCES "global".distribution_centres(dc_code) ON DELETE CASCADE,
	CONSTRAINT dc_excess_deficit_tag_product_code FOREIGN KEY (product_code) REFERENCES "global".product_master(product_code) ON DELETE CASCADE
);

