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
	CONSTRAINT dc_reserve_qty_new_pk PRIMARY KEY (product_code, channel, inventory_source, dc_code, type),
	CONSTRAINT dc_reserve1_product_fk FOREIGN KEY (product_code) REFERENCES "global".product_master(product_code) ON DELETE CASCADE,
	CONSTRAINT dc_reserve_qty_new_fk FOREIGN KEY (dc_code) REFERENCES "global".distribution_centres(dc_code)
);

--changeset adesh@impactanalytics.co:dc_reserve_quantity_v1 stripComments:false splitStatements:false context:columns_add labels:col-addition
--comment: Maintain-is-reserved-column
ALTER TABLE inventory_smart.dc_reserve_quantity ADD COLUMN IF NOT EXISTS is_reserved BOOLEAN DEFAULT false;

--changeset adesh@impactanalytics.co:dc_reserve_quantity_v2 stripComments:false splitStatements:false context:columns_add labels:col-addition
--comment: Maintain-perc-column
ALTER TABLE inventory_smart.dc_reserve_quantity ADD COLUMN IF NOT EXISTS "percentage" float4 NULL;