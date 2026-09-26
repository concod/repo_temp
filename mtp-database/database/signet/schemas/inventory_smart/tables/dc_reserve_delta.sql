--liquibase formatted sql
--changeset liquibase:alerts_product_level_1 stripComments:false splitStatements:false context:dc_reserve_delta_v2 labels:dc_reserve_delta_v2
--comment: initial changeset for alerts_product_level updated
CREATE TABLE IF NOT EXISTS inventory_smart.dc_reserve_delta (
	product_code varchar NOT NULL,
	quantity int4 NOT NULL,
	CONSTRAINT dc_reserve_delta_un UNIQUE (product_code)
);
ALTER TABLE inventory_smart.dc_reserve_delta DROP CONSTRAINT IF EXISTS dc_reserve_delta_fk;
ALTER TABLE inventory_smart.dc_reserve_delta ADD CONSTRAINT dc_reserve_delta_fk FOREIGN KEY (product_code) REFERENCES "global".product_master(product_code) ON DELETE CASCADE;