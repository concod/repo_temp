-- liquibase formatted sql
-- changeset ramkumar.vahanan@impactanalytics.co:dc_pack_reserve_quantity stripComments:false splitStatements:false context:MTP-75831 labels:MTP-75831 
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

--changeset adesh@impactanalytics.co:dc_reserve_quantity_v1 stripComments:false splitStatements:false context:columns_add labels:columns_add
--comment: Maintain-is-reserved-column
ALTER TABLE inventory_smart.dc_pack_reserve_quantity ADD COLUMN IF NOT EXISTS is_reserved BOOLEAN DEFAULT false;

--changeset adesh@impactanalytics.co:dc_reserve_quantity_v2 stripComments:false splitStatements:false context:columns_add labels:columns_upd
--comment: Maintain-percentage-updated-column
ALTER TABLE inventory_smart.dc_pack_reserve_quantity ADD COLUMN IF NOT EXISTS "percentage" float4 NULL;
ALTER TABLE inventory_smart.dc_pack_reserve_quantity ADD COLUMN IF NOT EXISTS updated_at timestamptz NULL;

--changeset himansh.bhardwaj@impactanalytics.co:adding pk stripComments:false splitStatements:false context:Release_1 labels:Custom_Migration_Technique
--comment: adding pk
ALTER TABLE inventory_smart.dc_pack_reserve_quantity ADD CONSTRAINT dc_pack_reserve_quantity_primary_key PRIMARY KEY (article,dc_code,pack_type_id);
