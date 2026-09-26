--liquibase formatted sql
--changeset liquibase:vendor_master stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for vendor_master
CREATE TABLE source_smart.vendor_master (
	vendor_id varchar(50) NOT NULL,
	vendor_name varchar(255) NULL,
	vendor_group _text NULL,
	country varchar(100) NULL,
	relationship_type varchar(100) NULL,
	esg_rating varchar(50) NULL,
	compliance varchar(50) NULL,
	CONSTRAINT vendor_master_pkey PRIMARY KEY (vendor_id)
);