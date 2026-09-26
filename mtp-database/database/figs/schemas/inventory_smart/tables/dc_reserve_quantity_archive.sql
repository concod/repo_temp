--liquibase formatted sql
--changeset abhishek.sagar@impactanalytics.co:dc_reserve_quantity_archive_figs stripComments:false splitStatements:false context:Release_1_0 ignore:false labels:pacsun_dc_reserve_quantity_archive
--comment: initial changeset for dc_reserve_quantity_archive
CREATE TABLE IF NOT EXISTS inventory_smart.dc_reserve_quantity_archive (
	product_code varchar NOT NULL,
	quantity int4 NULL,
	channel varchar NOT NULL,
	updated_at timestamptz NULL,
	"type" varchar NOT NULL,
	inventory_source varchar NOT NULL,
	dc_code int4 NOT NULL,
	reservation_till_date date NULL,
	created_at timestamptz DEFAULT now() NULL,
	instock_inclusion bool DEFAULT true NULL,
	updated_by varchar NULL,
	"comment" varchar NULL,
	incoming_asn_30 int4 NULL,
	incoming_asn_31_60 int4 NULL,
	incoming_asn_61_90 int4 NULL,
	l0_name VARCHAR null,
	l1_name VARCHAR null,
	l2_name VARCHAR null,
	l3_name VARCHAR null,
	l4_name VARCHAR null,
	article VARCHAR null,
	"size" VARCHAR null,
	deleted_date date DEFAULT CURRENT_DATE NOT NULL,
	CONSTRAINT dc_reserve_qty_archive_new_pk PRIMARY KEY (product_code, channel, inventory_source, dc_code, type, deleted_date),
	CONSTRAINT dc_reserve_qty_archive_new_fk FOREIGN KEY (dc_code) REFERENCES "global".distribution_centres(dc_code),
	CONSTRAINT dc_reserve_qty_archive_product_fk FOREIGN KEY (product_code) REFERENCES "global".product_master(product_code) ON DELETE CASCADE
);


--changeset abhishek.sagar@impactanalytics.co:dc_reserve_quantity_figs_rename stripComments:false splitStatements:false context:columns_add labels:col-rename
--comment: added columns
ALTER TABLE inventory_smart.dc_reserve_quantity_archive	RENAME COLUMN incoming_asn_30 TO incoming_po_30;
ALTER TABLE inventory_smart.dc_reserve_quantity_archive	RENAME COLUMN incoming_asn_31_60 TO incoming_po_31_60;
ALTER TABLE inventory_smart.dc_reserve_quantity_archive	RENAME COLUMN incoming_asn_61_90 TO incoming_po_61_90;