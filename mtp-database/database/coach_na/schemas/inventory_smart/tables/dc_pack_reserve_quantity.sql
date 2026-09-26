-- liquibase formatted sql
-- changeset aiyush.prasad@impactanalytics.co:dc_pack_reserve_quantity stripComments:false splitStatements:false context:MTP-83463 labels:MTP-83463 
-- comment: initial changeset for dc_pack_reserve_quantity

CREATE TABLE inventory_smart.dc_pack_reserve_quantity (
	article varchar(50) NULL,
	dc_code int4 NULL,
	channel varchar(50) NULL,
	pack_type_id varchar(50) NULL,
	incoming_po_30 int4 NULL,
	incoming_po_31_60 int4 NULL,
	incoming_po_61_90 int4 NULL,
	quantity int4 NULL,
	"type" varchar NULL
);
-- changeset manas.malik@impactanalytics.co:dc_pack_reserve_quantity_2 stripComments:false splitStatements:false context:MTP-83463 labels:MTP-83463 
--comment: add missing columns and constraints 
ALTER TABLE inventory_smart.dc_pack_reserve_quantity ADD COLUMN is_reserved bool DEFAULT false NULL,
 ADD COLUMN percentage float4 NULL, ADD COLUMN updated_at timestamptz NULL,
 ADD COLUMN reservation_till_date date NULL,
  ADD COLUMN created_at timestamptz DEFAULT now() NULL,
   ADD COLUMN instock_inclusion bool DEFAULT true NULL,
    ADD COLUMN updated_by varchar NULL,
	 ADD COLUMN "comment" varchar NULL,
ADD COLUMN dc_name varchar NULL;
ALTER TABLE inventory_smart.dc_pack_reserve_quantity ADD CONSTRAINT article_pack_un UNIQUE (article, pack_type_id, dc_code);
ALTER TABLE inventory_smart.dc_pack_reserve_quantity ADD CONSTRAINT dc_pack_reserve_quantity_dc_fk FOREIGN KEY (dc_code) REFERENCES "global".distribution_centres(dc_code) ON DELETE CASCADE;

-- changeset adesh@impactanalytics.co:modify-article-pack-unique-constraint stripComments:false splitStatements:false context:MTP-104051 labels:MTP-104051
--comment: MTP-104051:modify unique constraint to include channel and type columns
ALTER TABLE inventory_smart.dc_pack_reserve_quantity DROP CONSTRAINT IF EXISTS article_pack_un;
ALTER TABLE inventory_smart.dc_pack_reserve_quantity ADD CONSTRAINT article_pack_un UNIQUE (article, pack_type_id, dc_code, channel, type);

-- changeset adesh@impactanalytics.co:modify-unique-constraint-for-edit-and-set-all stripComments:false splitStatements:false context:MTP-104051 labels:MTP-104051
--comment: MTP-104051:modify unique constraint for edit and set-all
ALTER TABLE inventory_smart.dc_pack_reserve_quantity DROP CONSTRAINT IF EXISTS article_pack_un;
ALTER TABLE inventory_smart.dc_pack_reserve_quantity ADD CONSTRAINT article_pack_un UNIQUE (article, dc_code, pack_type_id);