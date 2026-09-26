--liquibase formatted sql
--changeset liquibase:vendor_capacity stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for vendor_capacity
CREATE TABLE source_smart.vendor_capacity (
	v_capacity_id varchar(255) NOT NULL,
	vendor_id varchar(255) NULL,
	monthly_capacity int4 NULL,
	valid_from_date date NULL,
	valid_to_date date NULL,
	CONSTRAINT vc_pk PRIMARY KEY (v_capacity_id),
	CONSTRAINT fk_vendor_cap FOREIGN KEY (vendor_id) REFERENCES source_smart.vendor_master(vendor_id) ON DELETE CASCADE
);