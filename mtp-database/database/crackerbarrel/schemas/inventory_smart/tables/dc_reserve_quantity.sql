--liquibase formatted sql
--changeset liquibase:dc_reserve_quantity stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
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


--changeset kaustubh.gupta:dc_reserve_quantity stripComments:false splitStatements:false context:initial_release labels:columns_add
--comment: schema change for dc_reserve_quantity
ALTER TABLE inventory_smart.dc_reserve_quantity
ADD COLUMN incoming_po_30 float8 NULL,
ADD COLUMN incoming_po_31_60 float8 NULL,
ADD COLUMN incoming_po_61_90 float8 NULL,
ADD COLUMN created_at date NULL,
ADD COLUMN reservation_till_date date NULL,
ADD COLUMN instock_inclusion bool NULL,
ADD COLUMN updated_by varchar NULL,
ADD COLUMN "comment" varchar NULL,
ADD COLUMN purpose varchar NULL;

--changeset adesh@impactanalytics.co:dc_reserve_quantity_v1 stripComments:false splitStatements:false context:columns_add labels:CB
--comment: Maintain-is-reserved-column
ALTER TABLE inventory_smart.dc_reserve_quantity ADD COLUMN IF NOT EXISTS is_reserved BOOLEAN DEFAULT false;
