--liquibase formatted sql
--changeset liquibase:asn_master stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for asn_master
CREATE TABLE source_smart.asn_master (
	asn_id varchar(255) NOT NULL,
	po_schedule_id varchar(255) NULL,
	vendor_id varchar(255) NULL,
	facility_id varchar(255) NULL,
	product_code varchar(255) NULL,
	store_code varchar(255) NULL,
	asn_qty int4 NULL,
	receipt_qty int4 NULL,
	quality_pass_qty int4 NULL,
	asn_creation_date date NULL,
	actual_delivery_date date NULL,
	syncstartdatetime timestamptz DEFAULT now() NULL,
	CONSTRAINT asn_master_pkey PRIMARY KEY (asn_id),
	CONSTRAINT fk_facility FOREIGN KEY (facility_id) REFERENCES source_smart.facility_master(facility_id) ON DELETE CASCADE,
	CONSTRAINT fk_po_schedule FOREIGN KEY (po_schedule_id) REFERENCES source_smart.po_schedule_master(po_schedule_id) ON DELETE CASCADE,
	CONSTRAINT fk_product FOREIGN KEY (product_code) REFERENCES source_smart.product_master(product_code) ON DELETE CASCADE,
	CONSTRAINT fk_store FOREIGN KEY (store_code) REFERENCES source_smart.store_master(store_code) ON DELETE CASCADE,
	CONSTRAINT fk_vendor FOREIGN KEY (vendor_id) REFERENCES source_smart.vendor_master(vendor_id) ON DELETE CASCADE
);