--liquibase formatted sql
--changeset swapnil.bhange@impactanalytics.co:dc_reserve_quantity_archive stripComments:false splitStatements:false context:Release_1_0 ignore:false labels:lovisa_dc_reserve_quantity_archive
--comment: initial changeset for dc_reserve_quantity_archive
-- DROP TABLE inventory_smart.dc_reserve_quantity_archive;

CREATE TABLE inventory_smart.dc_reserve_quantity_archive (
	product_code varchar NOT NULL,
	quantity int4 NULL,
	channel varchar NULL,
	updated_at timestamptz NULL,
	"type" varchar NOT NULL,
	inventory_source varchar NOT NULL,
	dc_code int4 NOT NULL,
	reservation_till_date date NULL,
	created_at timestamptz NULL DEFAULT now(),
	instock_inclusion bool NULL DEFAULT true,
	updated_by varchar NULL,
	"comment" varchar NULL,
	incoming_po_30 int4 NULL,
	incoming_po_31_60 int4 NULL,
	incoming_po_61_90 int4 NULL,
	deleted_date date NOT NULL DEFAULT CURRENT_DATE,
	purpose _varchar NULL,
	l0_name varchar NULL,
	l1_name varchar NULL,
	l2_name varchar NULL,
	l3_name varchar NULL,
	l4_name varchar NULL,
	article varchar NULL,
	range_name varchar NULL,
	"size" varchar NULL,
	CONSTRAINT dc_reserve_qty_archive_new_pk PRIMARY KEY (product_code, inventory_source, dc_code, type, deleted_date),
	CONSTRAINT dc_reserve_qty_archive_new_fk FOREIGN KEY (dc_code) REFERENCES "global".distribution_centres(dc_code),
	CONSTRAINT dc_reserve_qty_archive_product_fk FOREIGN KEY (product_code) REFERENCES "global".product_master(product_code) ON DELETE CASCADE
);

--changeset aleena.reji@impactanalytics.co:dc_reserve_quantity_archive_v1 stripComments:false splitStatements:false context:Release_1_0 ignore:false labels:lovisa_dc_reserve_quantity_archive_v1
--comment: initial changeset for dc_reserve_quantity_archive_v1
ALTER TABLE inventory_smart.dc_reserve_quantity_archive DROP CONSTRAINT IF EXISTS dc_reserve_qty_archive_product_fk;

ALTER TABLE inventory_smart.dc_reserve_quantity_archive ADD CONSTRAINT dc_reserve_qty_archive_product_fk FOREIGN KEY (dc_code) REFERENCES "global".distribution_centres(dc_code)
ON DELETE CASCADE ;