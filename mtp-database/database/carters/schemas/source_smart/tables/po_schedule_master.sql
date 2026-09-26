--liquibase formatted sql
--changeset liquibase:po_schedule_master stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for po_schedule_master
CREATE TABLE source_smart.po_schedule_master (
	po_schedule_id varchar(255) NOT NULL,
	po_id varchar(255) NULL,
	product_code varchar(255) NULL,
	facility_id varchar(255) NULL,
	dc_code varchar(50) NULL,
	ordered_quantity float8 NULL,
	requirement_date date NULL,
	unit_price float8 NULL,
	syncstartdatetime timestamptz DEFAULT now() NULL,
	CONSTRAINT po_schedule_pkey PRIMARY KEY (po_schedule_id),
	CONSTRAINT fk_facility FOREIGN KEY (facility_id) REFERENCES source_smart.facility_master(facility_id) ON DELETE CASCADE,
	CONSTRAINT fk_po FOREIGN KEY (po_id) REFERENCES source_smart.po_master(po_id) ON DELETE CASCADE,
	CONSTRAINT fk_product FOREIGN KEY (product_code) REFERENCES source_smart.product_master(product_code) ON DELETE CASCADE,
	CONSTRAINT fk_store FOREIGN KEY (dc_code) REFERENCES source_smart.store_master(store_code) ON DELETE CASCADE
);