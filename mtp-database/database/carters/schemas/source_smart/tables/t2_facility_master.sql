--liquibase formatted sql
--changeset liquibase:t2_facility_master stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for t2_facility_master
CREATE TABLE source_smart.t2_facility_master (
	tier2_facility_id varchar(20) NOT NULL,
	tier2_facility_name varchar(255) NOT NULL,
	tier2_vendor_name varchar(255) NULL,
	country varchar(100) NULL,
	region varchar(100) NULL,
	quality_rating varchar(10) NULL,
	esg_score numeric(5, 2) NULL,
	CONSTRAINT t2_facility_master_pkey PRIMARY KEY (tier2_facility_id)
);
