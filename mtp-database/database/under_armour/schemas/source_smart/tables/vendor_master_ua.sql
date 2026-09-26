--liquibase formatted sql
--changeset liquibase:vendor_master_ua stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for vendor_master_ua

CREATE TABLE source_smart.vendor_master_ua (
	vendor_id int4 NOT NULL,
	vendor_name varchar(50) NULL,
	vendor_group _text NULL,
	country varchar(50) NULL,
	relationship_type varchar(50) NULL,
	region varchar(50) NULL,
	esg_rating varchar(50) NULL,
	compliance varchar(50) NULL,
	CONSTRAINT vendor_master_ua_pk PRIMARY KEY (vendor_id)
);

--changeset mayankmukundam:vendor_master_ua_add_columns stripComments:false splitStatements:false context:Release_1_1 labels:liquibase_project_start
--comment: add columns to vendor_master_ua
ALTER TABLE source_smart.vendor_master_ua ADD COLUMN is_updated bool;
ALTER TABLE source_smart.vendor_master_ua ADD COLUMN is_active bool;
ALTER TABLE source_smart.vendor_master_ua ADD COLUMN created_at timestamptz;
ALTER TABLE source_smart.vendor_master_ua ADD COLUMN updated_at timestamptz;