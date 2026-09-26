--liquibase formatted sql
--changeset gauri.nair@impactanalytics.co:dc_reserve_quantity stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_starts
--comment: initial changeset for dc_reserve_quantity

CREATE TABLE if not exists inventory_smart.dc_reserve_quantity (
	product_code varchar NOT NULL,
	quantity int4 NULL,
	channel varchar NOT NULL,
	updated_at timestamptz NULL,
	"type" varchar NOT NULL,
	inventory_source varchar NOT NULL,
	dc_code int4 NOT NULL,
	is_reserved bool DEFAULT false NULL,
	percentage float4 NULL,
	CONSTRAINT dc_reserve_qty_new_pk PRIMARY KEY (product_code, channel, inventory_source, dc_code, type),
	CONSTRAINT dc_reserve1_product_fk FOREIGN KEY (product_code) REFERENCES "global".product_master(product_code) ON DELETE CASCADE,
	CONSTRAINT dc_reserve_qty_new_fk FOREIGN KEY (dc_code) REFERENCES "global".distribution_centres(dc_code)
);

--changeset gauri.nair@impactanalytics.co:dc_reserve_quantity_alter stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_starts_alter
--comment: alter table changeset for dc_reserve_quantity
alter table inventory_smart.dc_reserve_quantity add column if not exists incoming_po_30 numeric NULL,
	add column if not exists incoming_po_31_60 numeric NULL,
	add column if not exists incoming_po_61_90 numeric NULL,
	add column if not exists pack_type_id varchar NULL;

--changeset gauri.nair@impactanalytics.co:dc_reserve_quantity_alter_2 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_starts_alter_2
--comment: alter_2 table changeset for dc_reserve_quantity
alter table inventory_smart.dc_reserve_quantity add column if not exists reservation_till_date date null,
add column if not exists "comment" varchar null;

--changeset gauri.nair@impactanalytics.co:dc_reserve_quantity_alter_3 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_starts_alter_3
--comment: alter_3 table changeset for dc_reserve_quantity
ALTER TABLE inventory_smart.dc_reserve_quantity 
			ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now() NULL,
			ADD COLUMN IF NOT EXISTS instock_inclusion bool DEFAULT true NULL,
			ADD COLUMN IF NOT EXISTS updated_by varchar NULL,
			ADD COLUMN IF NOT EXISTS purpose _varchar NULL;