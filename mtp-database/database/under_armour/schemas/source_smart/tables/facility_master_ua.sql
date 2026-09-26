--liquibase formatted sql
--changeset liquibase:facility_master_ua stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for allocatifacility_master_uaon_strategy_ua

CREATE TABLE source_smart.facility_master_ua (
	facility_id int4 NULL,
	vendor_id int4 NULL,
	facility_name varchar(50) NULL,
	city varchar(50) NULL,
	country varchar(50) NULL,
	worker_count_range varchar(50) NULL,
	quality_certification varchar(50) NULL,
	esg_rating varchar(50) NULL,
	region varchar(50) NULL
);



--changeset mayankmukundam:facility_master_ua_add_columns stripComments:false splitStatements:false context:Release_1_1 labels:liquibase_project_start
--comment: add columns to facility_master_ua
ALTER TABLE source_smart.facility_master_ua ADD COLUMN is_updated bool;
ALTER TABLE source_smart.facility_master_ua ADD COLUMN is_active bool;
ALTER TABLE source_smart.facility_master_ua ADD COLUMN created_at timestamptz;
ALTER TABLE source_smart.facility_master_ua ADD COLUMN updated_at timestamptz;



--changeset mayankmukundam:facility_master_ua_alter_columns stripComments:false splitStatements:false context:Release_1_2 labels:liquibase_project_start
--comment: alter columns in facility_master_ua
ALTER TABLE source_smart.facility_master_ua ALTER COLUMN city TYPE varchar;
ALTER TABLE source_smart.facility_master_ua ALTER COLUMN country TYPE varchar;
ALTER TABLE source_smart.facility_master_ua ALTER COLUMN worker_count_range TYPE varchar;
ALTER TABLE source_smart.facility_master_ua ALTER COLUMN quality_certification TYPE varchar;
ALTER TABLE source_smart.facility_master_ua ALTER COLUMN esg_rating TYPE varchar;
ALTER TABLE source_smart.facility_master_ua ALTER COLUMN region TYPE varchar;
