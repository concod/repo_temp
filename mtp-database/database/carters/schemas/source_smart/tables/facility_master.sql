--liquibase formatted sql
--changeset liquibase:facility_master stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for facility_master
CREATE TABLE source_smart.facility_master (
	facility_id varchar(50) NOT NULL,
	vendor_id varchar(50) NULL,
	facility_name varchar(255) NULL,
	city varchar(100) NULL,
	country varchar(100) NULL,
	worker_count_range varchar(100) NULL,
	quality_certification _text NULL,
	esg_rating varchar NULL,
	region varchar(50) NULL,
	CONSTRAINT vendor_facilities_pkey PRIMARY KEY (facility_id),
	CONSTRAINT fk_vendor FOREIGN KEY (vendor_id) REFERENCES source_smart.vendor_master(vendor_id) ON DELETE CASCADE
);