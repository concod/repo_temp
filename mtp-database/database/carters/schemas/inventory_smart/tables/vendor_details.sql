-- liquibase formatted sql
-- changeset shekharkrishna.nirnakar@impactanalytics.co:vendor_details stripComments:false splitStatements:false context: db_sync labels:vendor_details
-- comment: initial changeset for vendor_details
CREATE TABLE inventory_smart.vendor_details (
	article varchar(50) NULL,
	pack_id varchar(50) NULL,
	dc_code varchar(50) NULL,
	bulk_po varchar(50) NULL,
	channel varchar(50) NULL,
	is_pack varchar(50) NULL,
	vendor_cd varchar(10) NULL,
    CONSTRAINT vendor_details_un UNIQUE (article, dc_code, pack_id,bulk_po)
	
);