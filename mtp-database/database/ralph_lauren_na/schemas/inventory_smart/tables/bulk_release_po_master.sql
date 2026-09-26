--liquibase formatted sql
--changeset saad.adeeb@impactanalytics.co:bulk_release_po_master stripComments:false splitStatements:false context:Release_1_0 labels:MTP-51599
--comment: initial changeset for bulk_release_po_master
CREATE  TABLE inventory_smart.bulk_release_po_master (
	po_nbr text NULL,
	dept_nbr int4 NULL,
	class_nbr int4 NULL,
	style_nbr int4 NULL,
	color_nbr text NULL,
	size_nbr text NULL,
	div_nbr int4 NULL,
	vendor_nbr int4 NULL,
	"SIMPLE_VENDOR_COST" float4 NULL,
	po_vendor_code int4 NULL,
	"REQUESTED_SHIP_DATE" date NULL,
	"CANCEL_DATE" date NULL,
	"ANTICIPATE_DATE" date NULL,
	"VENDOR_STYLE" text NULL,
	"dest_whouse" int4 NULL,
	avail_qty int4 NULL,
	product_code text null,
	CONSTRAINT bulk_release_po_un UNIQUE (product_code,po_nbr, dest_whouse),
	CONSTRAINT bulk_release_product_fk FOREIGN KEY (product_code) REFERENCES "global".product_master(product_code) ON DELETE CASCADE NOT VALID
);
--changeset saad.adeeb@impactanalytics.co:bulk_release_po_master_col_change stripComments:false splitStatements:false context:Release_1_0 labels:MTP-51599
--comment: bulk_release_po_master col change
ALTER TABLE inventory_smart.bulk_release_po_master RENAME COLUMN "SIMPLE_VENDOR_COST" TO simple_vendor_cost;
ALTER TABLE inventory_smart.bulk_release_po_master RENAME COLUMN "REQUESTED_SHIP_DATE" TO requested_ship_date;
ALTER TABLE inventory_smart.bulk_release_po_master RENAME COLUMN "CANCEL_DATE" TO cancel_date;
ALTER TABLE inventory_smart.bulk_release_po_master RENAME COLUMN "ANTICIPATE_DATE" TO anticipate_date;
ALTER TABLE inventory_smart.bulk_release_po_master RENAME COLUMN "VENDOR_STYLE" TO vendor_style;