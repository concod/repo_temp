--liquibase formatted sql
--changeset liquibase:dc_reserve_quantity_archive stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for dc_reserve_quantity_archive

CREATE TABLE IF NOT EXISTS inventory_smart.dc_reserve_quantity_archive (
	product_code varchar NOT NULL,
	quantity int4 NULL,
	created_at timestamptz DEFAULT now() NULL,
	"type" varchar NOT NULL,
	dc_code int4 NOT NULL,
	channel varchar NOT NULL,
	reservation_till_date date NULL,
	instock_inclusion bool DEFAULT true NULL,
	updated_by varchar NULL,
	updated_at timestamptz NULL,
	inventory_source varchar NOT NULL,
	"comment" varchar NULL,
	purpose varchar NULL,
	incoming_po_30 int4 NULL,
	incoming_po_31_60 int4 NULL,
	incoming_po_61_90 int4 NULL,
	deleted_date date DEFAULT CURRENT_DATE NOT NULL,
	CONSTRAINT dc_reserve_qty_archive_new_pk PRIMARY KEY (product_code, channel, inventory_source, dc_code, type, deleted_date),
	CONSTRAINT dc_reserve_qty_archive_new_fk FOREIGN KEY (dc_code) REFERENCES "global".distribution_centres(dc_code),
	CONSTRAINT dc_reserve_qty_archive_product_fk FOREIGN KEY (product_code) REFERENCES "global".product_master(product_code) ON DELETE CASCADE
);