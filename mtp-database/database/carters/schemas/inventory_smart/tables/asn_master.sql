--liquibase formatted sql
--changeset anujkumar.singh@impactanalytics.co:asn_master stripComments:false splitStatements:false context:Release_1_0 labels:VPP-262
--comment: initial changeset for asn_master
CREATE TABLE inventory_smart.asn_master (
	asn_code varchar NOT NULL,
	asn_id varchar NOT NULL,
	asn_item varchar NOT NULL,
	po_code varchar NOT NULL,
	po_id varchar NOT NULL,
	po_item varchar NOT NULL,
	product_code varchar NOT NULL,
	requirement_date date NOT NULL,
	channel varchar NOT NULL,
	allocated_qty int4 NULL,
	available_qty int4 NULL,
	dc_code int4 NOT NULL,
	not_before_date date NULL,
	pack_type_id varchar NULL,
	article varchar NULL,
	number_of_allocations INTEGER NULL,
	CONSTRAINT asn_master_un UNIQUE (asn_code),
	CONSTRAINT asn_master_dc_fk FOREIGN KEY (dc_code) REFERENCES "global".distribution_centres(dc_code) ON DELETE CASCADE,
	CONSTRAINT asn_master_product_fk FOREIGN KEY (product_code) REFERENCES "global".product_master(product_code) ON DELETE CASCADE
);
--changeset anujkumar.singh@impactanalytics.co:asn_master_updated stripComments:false splitStatements:false context:Victorias_Secret_InventorySmart labels:VPP-273
--comment: Dropping unnecessary columns from asn_master
ALTER TABLE inventory_smart.asn_master DROP COLUMN product_code;
ALTER TABLE inventory_smart.asn_master DROP COLUMN allocated_qty;
ALTER TABLE inventory_smart.asn_master DROP COLUMN not_before_date;