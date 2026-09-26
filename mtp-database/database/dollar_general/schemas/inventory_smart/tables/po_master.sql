--liquibase formatted sql
--changeset liquibase:po_master stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for po_master
CREATE TABLE inventory_smart.po_master (
	allocated_qty int4 NULL,
	ordered_qty int4 NULL,
	po_code text NULL,
	primary_sku text NULL,
	requirement_date date NULL,
	po_date date NULL,
	dc_code text NULL,
	vendor_code text NULL
);