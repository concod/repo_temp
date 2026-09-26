--liquibase formatted sql
--changeset liquibase:facility_lead_time_summary_ua stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for facility_lead_time_summary_ua
CREATE TABLE source_smart.facility_lead_time_summary_ua (
	article varchar(50) NULL,
	store_code varchar(50) NULL,
	facility_id int4 NULL,
	facility_country varchar(50) NULL,
	season_id varchar(50) NULL,
	longest_component int4 NULL,
	assembly_time int4 NULL,
	transit_and_custom_time int4 NULL,
	construction_type_id varchar(50) NULL,
	sourcing_class varchar(50) NULL,
	lead_time_id int4 NULL,
	t2_sourcing_option_id int4 NULL,
	t2_transit_time varchar(50) NULL,
	total_lead_time int4 NULL,
	product_code varchar NULL
);

--changeset mayank.mukundam@impactanalytics.co:facility_lead_time_summary_ua_add_columns stripComments:false splitStatements:false context:Release_1_1 labels:liquibase_project_start
--comment: add columns to facility_lead_time_summary_ua
ALTER TABLE source_smart.facility_lead_time_summary_ua ADD COLUMN is_updated bool;
ALTER TABLE source_smart.facility_lead_time_summary_ua ADD COLUMN is_active bool;
ALTER TABLE source_smart.facility_lead_time_summary_ua ADD COLUMN created_at timestamptz;
ALTER TABLE source_smart.facility_lead_time_summary_ua ADD COLUMN updated_at timestamptz;

--changeset mayank.mukundam@impactanalytics.co:facility_lead_time_summary_ua_sourcing_class_type stripComments:false splitStatements:false context:Release_1_2 labels:liquibase_project_start
--comment: change sourcing_class column type to varchar
ALTER TABLE source_smart.facility_lead_time_summary_ua ALTER COLUMN sourcing_class TYPE varchar;
ALTER TABLE source_smart.facility_lead_time_summary_ua ALTER COLUMN product_code TYPE varchar;

