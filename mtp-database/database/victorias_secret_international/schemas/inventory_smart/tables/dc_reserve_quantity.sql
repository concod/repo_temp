--liquibase formatted sql
--changeset liquibase:dc_reserve_qty_vs_intl stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for dc_reserve_quantity

CREATE TABLE IF NOT EXISTS inventory_smart.dc_reserve_quantity (
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
	incoming_po_30 int4 NULL,
	incoming_po_31_60 int4 NULL,
	incoming_po_61_90 int4 NULL,
	purpose _varchar NULL,
	is_reserved bool DEFAULT false NULL,
	percentage float4 NULL,
	CONSTRAINT dc_reserve_qty_new_pk PRIMARY KEY (product_code, channel, inventory_source, dc_code, type),
	CONSTRAINT dc_reserve1_product_fk FOREIGN KEY (product_code) REFERENCES "global".product_master(product_code) ON DELETE CASCADE,
	CONSTRAINT dc_reserve_qty_new_fk FOREIGN KEY (dc_code) REFERENCES "global".distribution_centres(dc_code)
);