--liquibase formatted sql
--changeset liquibase:dc_details_table stripComments:false splitStatements:false context:Release_1_0 labels:MTP-68896
--comment: initial changeset for dc_details_table
CREATE TABLE inventory_smart.dc_details_table (
	article varchar NOT NULL,
	product_code varchar NOT NULL,
	dc_code int4 NOT NULL,
	next_po_upcoming_units int4 NULL,
	sales_forecast float8 NULL,
	demand_projection float8 NULL,
	excess_deficit_tag varchar NULL,
	recommendation_flag bool default false,
	next_po_upcoming_date date NULL,
	excess_deficit_units int4 NULL,
	cwos int4 NULL
);


--changeset kamuju.mahaveer:dc_details_table_v1 stripComments:false splitStatements:false context:Release_1_0 labels:VS-629
--comment: Updated schema for dc_details_table
ALTER TABLE inventory_smart.dc_details_table ADD CONSTRAINT dc_details_table_unique UNIQUE (product_code, dc_code);
ALTER TABLE inventory_smart.dc_details_table ADD CONSTRAINT dc_details_table_dc_code FOREIGN KEY (dc_code) REFERENCES global.distribution_centres(dc_code) ON DELETE CASCADE;
ALTER TABLE inventory_smart.dc_details_table ADD CONSTRAINT dc_details_table_product_code FOREIGN KEY (product_code) REFERENCES global.product_master(product_code) ON DELETE CASCADE;

