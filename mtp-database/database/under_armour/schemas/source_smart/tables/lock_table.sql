--liquibase formatted sql
--changeset genuine.basil@impactanalytics.co:lock_table stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for lock_table
CREATE TABLE source_smart.lock_table (
	product_code varchar(255) NOT NULL,
	subregion varchar(255) NOT NULL,
	facility_id int4 NOT NULL,
	facility_name varchar(255) NULL,
	l0_name varchar(255) NULL,
	season_name varchar(255) NULL,
	forecast_version varchar(255) NULL,
	lock_type varchar(255) NOT NULL,
	demand int4 NULL,
	CONSTRAINT lock_table_unique UNIQUE (product_code,subregion,facility_id,facility_name,l0_name,season_name,forecast_version)
);

--changeset genuine.basil@impactanalytics.co:lock_table_facility_id_nullable stripComments:false splitStatements:false context:Release_1_1 labels:liquibase_project_start
--comment: make facility_id nullable
ALTER TABLE source_smart.lock_table ALTER COLUMN facility_id DROP NOT NULL;