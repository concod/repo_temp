--liquibase formatted sql
--changeset liquibase:dc_reserve_quantity_1 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for dc_reserve_quantity

CREATE TABLE IF NOT EXISTS inventory_smart.dc_reserve_quantity (
	product_code varchar NOT NULL,
	quantity int4 NULL,
	channel varchar NOT NULL,
	updated_at timestamptz NULL,
	"type" varchar NOT NULL,
	inventory_source varchar NOT NULL,
	dc_code int4 NOT NULL,
	CONSTRAINT dc_reserve_qty_new_pk PRIMARY KEY (product_code, channel, inventory_source, dc_code, type),
	CONSTRAINT dc_reserve1_product_fk FOREIGN KEY (product_code) REFERENCES "global".product_master(product_code) ON DELETE CASCADE,
	CONSTRAINT dc_reserve_qty_new_fk FOREIGN KEY (dc_code) REFERENCES "global".distribution_centres(dc_code)
);

--changeset abhishek.sagar@impactanalytics.co:dc_reserve_quantity_figs_rnm stripComments:false splitStatements:false context:columns_add labels:col-rnm
--comment: added columns
ALTER TABLE inventory_smart.dc_reserve_quantity 
			ADD COLUMN IF NOT EXISTS reservation_till_date date NULL,
			ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now() NULL,
			ADD COLUMN IF NOT EXISTS instock_inclusion bool DEFAULT true NULL,
			ADD COLUMN IF NOT EXISTS updated_by varchar NULL,
			ADD COLUMN IF NOT EXISTS "comment" varchar NULL,
			ADD COLUMN IF NOT EXISTS incoming_po_30 int4 NULL,
			ADD COLUMN IF NOT EXISTS incoming_po_31_60 int4 NULL,
			ADD COLUMN IF NOT EXISTS incoming_po_61_90 int4 NULL,
			ADD COLUMN IF NOT EXISTS l0_name varchar NULL,
			ADD COLUMN IF NOT EXISTS l1_name varchar NULL,
			ADD COLUMN IF NOT EXISTS l2_name varchar NULL,
			ADD COLUMN IF NOT EXISTS l3_name varchar NULL,
			ADD COLUMN IF NOT EXISTS l4_name varchar NULL,
			ADD COLUMN IF NOT EXISTS article varchar NULL,
			ADD COLUMN IF NOT EXISTS "size" varchar NULL;

