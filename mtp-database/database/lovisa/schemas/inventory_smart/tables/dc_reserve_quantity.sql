--liquibase formatted sql
--changeset rajesh.kumar@impactanalytics.co:dc_reserve_quantity stripComments:false splitStatements:false context:Release_1_0 ignore:false labels:lovisa_dc_reserve_quantity
--comment: initial changeset for dc_reserve_quantity

CREATE TABLE inventory_smart.dc_reserve_quantity (
	product_code varchar NOT NULL,
	quantity int4 NULL,
	channel varchar NULL,
	updated_at timestamptz NULL,
	"type" varchar NOT NULL,
	inventory_source varchar NOT NULL,
	dc_code int4 NOT NULL,
	reservation_till_date date NULL,
	created_at timestamptz DEFAULT now() NULL,
	instock_inclusion bool DEFAULT true NULL,
	updated_by varchar NULL,
	"comment" varchar NULL,
	incoming_po_30 int4 NULL,
	incoming_po_31_60 int4 NULL,
	incoming_po_61_90 int4 NULL,
    is_reserved bool DEFAULT false NULL,
	l0_name varchar NULL,
	l1_name varchar NULL,
	l2_name varchar NULL,
	l3_name varchar NULL,
	l4_name varchar NULL,
	l5_name varchar NULL,
	article varchar NULL,
    range_name varchar NULL,
	"size" varchar NULL,
    percentage float4 NULL,
	CONSTRAINT dc_reserve_qty_new_pk PRIMARY KEY (product_code, inventory_source, dc_code, type),
	CONSTRAINT dc_reserve1_product_fk FOREIGN KEY (product_code) REFERENCES "global".product_master(product_code) ON DELETE CASCADE,
	CONSTRAINT dc_reserve_qty_new_fk FOREIGN KEY (dc_code) REFERENCES "global".distribution_centres(dc_code)
);


--changeset aleena.reji@impactanalytics.co:dc_reserve_quantity_v1 stripComments:false splitStatements:false context:Release_1_0 ignore:false labels:lovisa_dc_reserve_quantity_v1
--comment: initial changeset for dc_reserve_quantity_v1
ALTER TABLE inventory_smart.dc_reserve_quantity DROP CONSTRAINT IF EXISTS dc_reserve_qty_new_fk;

ALTER TABLE inventory_smart.dc_reserve_quantity ADD CONSTRAINT dc_reserve_qty_new_fk FOREIGN KEY (dc_code) REFERENCES "global".distribution_centres(dc_code)
ON DELETE CASCADE ;


--changeset aleena.reji@impactanalytics.co:dc_reserve_quantity_v2 stripComments:false splitStatements:false context:Release_1_0 ignore:false labels:lovisa_dc_reserve_quantity_v2
--comment: initial changeset for dc_reserve_quantity_v2
ALTER TABLE inventory_smart.dc_reserve_quantity DROP CONSTRAINT IF EXISTS dc_reserve_qty_new_pk;

ALTER TABLE inventory_smart.dc_reserve_quantity ADD CONSTRAINT dc_reserve_qty_new_pk PRIMARY KEY (product_code, inventory_source, dc_code, type, channel);