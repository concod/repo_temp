--liquibase formatted sql
--changeset liquibase:po_master stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for po_master
CREATE TABLE source_smart.po_master (
	po_id varchar(50) NOT NULL,
	vendor_id varchar(50) NULL,
	po_creation_date date NULL,
	channel varchar(100) NULL,
	currency_code bpchar(3) NULL,
	payment_terms varchar(100) NULL,
	syncstartdatetime timestamptz DEFAULT now() NULL,
	CONSTRAINT po_key PRIMARY KEY (po_id),
	CONSTRAINT fk_vendor FOREIGN KEY (vendor_id) REFERENCES source_smart.vendor_master(vendor_id) ON DELETE CASCADE
);