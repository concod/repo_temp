--liquibase formatted sql
--changeset renugopal:dc_reserve_quantity stripComments:false splitStatements:false context:Release_2_O labels:FIX_DDL
--comment fixed alter table constraint dc_reserve_qty_new_pk query
CREATE TABLE inventory_smart.dc_reserve_quantity (
	product_code varchar NOT NULL,
	quantity int4 NULL,
	channel varchar NOT NULL,
	updated_at timestamptz NULL,
	"type" varchar NOT NULL,
	inventory_source varchar NOT NULL,
	dc_code int4 NOT NULL,
	mapping_code int4 NULL,
	created_at timestamptz NOT NULL DEFAULT now()	
);

--changeset shubham:dc_reserve_quantity stripComments:false splitStatements:false context:Release_2_O labels:FIX_DDL
--comment: fixed alter table constraint dc_reserve_qty_new_pk query

ALTER TABLE inventory_smart.dc_reserve_quantity ADD CONSTRAINT dc_reserve_quantity_fk FOREIGN KEY (dc_code) REFERENCES "global".distribution_centres(dc_code) ON DELETE CASCADE;
ALTER TABLE inventory_smart.dc_reserve_quantity ADD CONSTRAINT dc_reserve_quantity_product_fk FOREIGN KEY (product_code) REFERENCES "global".product_master(product_code) ON DELETE CASCADE;
ALTER TABLE inventory_smart.dc_reserve_quantity ADD CONSTRAINT dc_reserve_qty_new_pk PRIMARY KEY (product_code, channel, inventory_source, dc_code, type);
