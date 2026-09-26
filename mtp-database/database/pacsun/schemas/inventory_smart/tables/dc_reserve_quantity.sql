--liquibase formatted sql
--changeset sreevathsa.sp@impactanalytics.co:dc_reserve_quantity stripComments:false splitStatements:false context:Release_1_0 ignore:false labels:pacsun_dc_reserve_quantity
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
	incoming_asn_30 int4 NULL,
	incoming_asn_31_60 int4 NULL,
	incoming_asn_61_90 int4 NULL,
	CONSTRAINT dc_reserve_qty_new_pk PRIMARY KEY (product_code, channel, inventory_source, dc_code, type),
	CONSTRAINT dc_reserve1_product_fk FOREIGN KEY (product_code) REFERENCES "global".product_master(product_code) ON DELETE CASCADE,
	CONSTRAINT dc_reserve_qty_new_fk FOREIGN KEY (dc_code) REFERENCES "global".distribution_centres(dc_code)
);


--comment: changeset add column purpose
ALTER TABLE "inventory_smart".dc_reserve_quantity ADD COLUMN IF NOT EXISTS "comment" varchar null;
ALTER TABLE "inventory_smart".dc_reserve_quantity ADD COLUMN IF NOT EXISTS instock_inclusion bool DEFAULT true null;
ALTER TABLE "inventory_smart".dc_reserve_quantity ADD COLUMN IF NOT EXISTS updated_by varchar null;
ALTER TABLE "inventory_smart".dc_reserve_quantity ADD COLUMN IF NOT EXISTS reservation_till_date date NULL;
ALTER TABLE "inventory_smart".dc_reserve_quantity ADD COLUMN IF NOT EXISTS incoming_asn_30 int4 NULL;
ALTER TABLE "inventory_smart".dc_reserve_quantity ADD COLUMN IF NOT EXISTS incoming_asn_31_60 int4 NULL;
ALTER TABLE "inventory_smart".dc_reserve_quantity ADD COLUMN IF NOT EXISTS incoming_asn_61_90 int4 NULL;
ALTER TABLE "inventory_smart".dc_reserve_quantity ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now() null;


--comment: changeset add additional columns purpose 
ALTER TABLE "inventory_smart".dc_reserve_quantity ADD COLUMN IF NOT EXISTS l0_name varchar NULL;
ALTER TABLE "inventory_smart".dc_reserve_quantity ADD COLUMN IF NOT EXISTS l1_name varchar NULL;
ALTER TABLE "inventory_smart".dc_reserve_quantity ADD COLUMN IF NOT EXISTS l2_name varchar NULL;
ALTER TABLE "inventory_smart".dc_reserve_quantity ADD COLUMN IF NOT EXISTS l3_id_name varchar NULL;
ALTER TABLE "inventory_smart".dc_reserve_quantity ADD COLUMN IF NOT EXISTS l4_name varchar NULL;
ALTER TABLE "inventory_smart".dc_reserve_quantity ADD COLUMN IF NOT EXISTS l5_name varchar NULL;
ALTER TABLE "inventory_smart".dc_reserve_quantity ADD COLUMN IF NOT EXISTS article varchar NULL;
ALTER TABLE "inventory_smart".dc_reserve_quantity ADD COLUMN IF NOT EXISTS "size" varchar NULL;

