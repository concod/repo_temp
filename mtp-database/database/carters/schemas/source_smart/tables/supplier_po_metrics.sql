--liquibase formatted sql
--changeset liquibase:supplier_po_metrics stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for supplier_po_metrics
CREATE TABLE source_smart.supplier_po_metrics (
	po_schedule_id varchar(255) NULL,
	po_id varchar(255) NULL,
	product_code varchar(255) NOT NULL,
	vendor_id varchar(255) NULL,
	facility_id varchar(255) NULL,
	ordered_quantity int4 NULL,
	received_quantity int4 NULL,
	estimated_delivery_date date NULL,
	final_delivery_date date NULL,
	quality_pass_quantity int4 NULL,
	on_time_status varchar(255) NULL,
	in_full_status varchar(255) NULL,
	syncstartdatetime timestamptz DEFAULT now() NULL,
	CONSTRAINT fk_facility FOREIGN KEY (facility_id) REFERENCES source_smart.facility_master(facility_id) ON DELETE CASCADE,
	CONSTRAINT fk_po FOREIGN KEY (po_id) REFERENCES source_smart.po_master(po_id) ON DELETE CASCADE,
	CONSTRAINT fk_po_scheduler FOREIGN KEY (po_schedule_id) REFERENCES source_smart.po_schedule_master(po_schedule_id) ON DELETE CASCADE,
	CONSTRAINT fk_product FOREIGN KEY (product_code) REFERENCES source_smart.product_master(product_code) ON DELETE CASCADE,
	CONSTRAINT fk_vendor FOREIGN KEY (vendor_id) REFERENCES source_smart.vendor_master(vendor_id) ON DELETE CASCADE
);