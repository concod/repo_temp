--liquibase formatted sql
--changeset liquibase:dc_reserve_quantity stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for dc_reserve_quantity
CREATE TABLE inventory_smart.dc_reserve_quantity (
	product_code varchar NOT NULL,
	quantity int4 NULL,
	channel varchar NOT NULL,
	updated_at timestamptz NULL,
	"type" varchar NOT NULL,
	inventory_source varchar NOT NULL,
	dc_code int4 NOT NULL,
	reservation_till_date date NULL,
	created_at timestamptz NULL DEFAULT now(),
	instock_inclusion bool NULL DEFAULT true,
	updated_by varchar NULL,
	"comment" varchar NULL,
	CONSTRAINT dc_reserve_qty_new_pk PRIMARY KEY (product_code, channel, inventory_source, dc_code, type),
	CONSTRAINT dc_reserve1_product_fk FOREIGN KEY (product_code) REFERENCES "global".product_master(product_code) ON DELETE CASCADE,
	CONSTRAINT dc_reserve_qty_new_fk FOREIGN KEY (dc_code) REFERENCES "global".distribution_centres(dc_code)
);
--changeset kamuju.mahaveer@impactanalytics.co:dc_reserve_quantity_v1 stripComments:false splitStatements:false context:VS_inv_smart labels:VS-162
--comment: Added PO metrics as per requirement
ALTER TABLE inventory_smart.dc_reserve_quantity ADD incoming_po_30 int4 NULL;
ALTER TABLE inventory_smart.dc_reserve_quantity ADD incoming_po_31_60 int4 NULL;
ALTER TABLE inventory_smart.dc_reserve_quantity ADD incoming_po_61_90 int4 NULL;


--changeset kamuju.mahaveer@impactanalytics.co:dc_reserve_quantity_v2 stripComments:false splitStatements:false context:VS_inv_smart labels:VS-162
--comment: Added Purpose as per requirement
ALTER TABLE inventory_smart.dc_reserve_quantity ADD COLUMN IF NOT EXISTS purpose _varchar NULL;

--changeset adesh@impactanalytics.co:dc_reserve_quantity_v3 stripComments:false splitStatements:false context:VS_inv_smart labels:VS-163
--comment: Maintain-is-reserved-column
ALTER TABLE inventory_smart.dc_reserve_quantity ADD COLUMN IF NOT EXISTS is_reserved BOOLEAN DEFAULT false;

--changeset adesh@impactanalytics.co:dc_reserve_quantity_v2 stripComments:false splitStatements:false context:columns_add labels:columns_upd
--comment: Maintain-percentage-column
ALTER TABLE inventory_smart.dc_reserve_quantity ADD COLUMN IF NOT EXISTS "percentage" float4 NULL;

