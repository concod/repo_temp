--liquibase formatted sql
--changeset liquibase:intermediate_delta_inventory stripComments:false splitStatements:false context:MTP-17787 labels:MTP-17787
--comment: initial changeset for intermediate_delta_inventory
CREATE TABLE inventory_smart.intermediate_delta_inventory (
	store_code varchar NOT NULL,
	product_code varchar NOT NULL,
	oh float4 NULL,
	origin_source varchar NULL,
	created_date timestamptz NOT NULL,
	process_date timestamptz NULL,
	status varchar NULL,
	batch_no varchar NULL,
	ats_qty int4 NULL,
	unallocated_qty float4 NULL,
	CONSTRAINT intermediate_delta_inventory_un UNIQUE (product_code, store_code)
);
--changeset adeshkumar:intermediate_delta_inventory stripComments:false splitStatements:false context:MTP-17787 labels:MTP-17787
--comment: removing unique constraint on product_code and store-code
ALTER TABLE inventory_smart.intermediate_delta_inventory DROP CONSTRAINT intermediate_delta_inventory_un;
