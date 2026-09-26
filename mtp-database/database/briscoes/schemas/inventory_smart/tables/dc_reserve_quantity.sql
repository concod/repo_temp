--liquibase formatted sql
--changeset samarjit.mazumder@impactanalytics.co:dc_reserve_quantity stripComments:false splitStatements:false context:Release_1_0 ignore:false labels:briscoes_dc_reserve_quantity
--comment: initial changeset for dc_reserve_quantity
CREATE TABLE IF NOT EXISTS inventory_smart.dc_reserve_quantity (
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
	purpose _varchar NULL,
	CONSTRAINT dc_reserve_qty_new_pk PRIMARY KEY (product_code, inventory_source, dc_code, type),
	CONSTRAINT dc_reserve1_product_fk FOREIGN KEY (product_code) REFERENCES "global".product_master(product_code) ON DELETE CASCADE,
	CONSTRAINT dc_reserve_qty_new_fk FOREIGN KEY (dc_code) REFERENCES "global".distribution_centres(dc_code)
);

--changeset samarjit.mazumder@impactanalytics.co:drop_column_purpose stripComments:false splitStatements:false context:Release_1_0 ignore:false labels:briscoes_dc_reserve_quantity_column_remove
--comment: changeset remove column purpose
alter table inventory_smart.dc_reserve_quantity drop column purpose;

--changeset nibeel.yunus@impactanalytics.co:add_cloumns stripComments:false splitStatements:false context:MTP-64270 ignore:false labels:MTP-64270
--comment: changeset remove column purpose
ALTER TABLE "inventory_smart".dc_reserve_quantity ADD COLUMN IF NOT EXISTS l0_name varchar NULL;
ALTER TABLE "inventory_smart".dc_reserve_quantity ADD COLUMN IF NOT EXISTS l1_name varchar NULL;
ALTER TABLE "inventory_smart".dc_reserve_quantity ADD COLUMN IF NOT EXISTS l2_name varchar NULL;
ALTER TABLE "inventory_smart".dc_reserve_quantity ADD COLUMN IF NOT EXISTS l3_name varchar NULL;
ALTER TABLE "inventory_smart".dc_reserve_quantity ADD COLUMN IF NOT EXISTS l4_name varchar NULL;
ALTER TABLE "inventory_smart".dc_reserve_quantity ADD COLUMN IF NOT EXISTS l5_name varchar NULL;
ALTER TABLE "inventory_smart".dc_reserve_quantity ADD COLUMN IF NOT EXISTS article varchar NULL;
ALTER TABLE "inventory_smart".dc_reserve_quantity ADD COLUMN IF NOT EXISTS "size" varchar NULL;

--changeset adesh@impactanalytics.co:dc_reserve_quantity_v1 stripComments:false splitStatements:false context:columns_add labels:col-addition
--comment: maintain-is-reserved-column-and-perc-column
ALTER TABLE inventory_smart.dc_reserve_quantity ADD COLUMN IF NOT EXISTS is_reserved BOOLEAN DEFAULT false;
ALTER TABLE inventory_smart.dc_reserve_quantity ADD COLUMN IF NOT EXISTS "percentage" float4 NULL;


--changeset samarjit.mazumder@impactanalytics.co:alter primary key stripComments:false splitStatements:false context:Release_1_0 ignore:false labels:briscoes_alter_primary_key
--comment: changeset alter primary key
ALTER TABLE inventory_smart.dc_reserve_quantity DROP CONSTRAINT dc_reserve_qty_new_pk;
ALTER TABLE inventory_smart.dc_reserve_quantity 
ADD CONSTRAINT dc_reserve_qty_new_pk 
PRIMARY KEY (product_code, inventory_source, dc_code, type, channel);