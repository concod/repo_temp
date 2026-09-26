--liquibase formatted sql
--changeset liquibase:facility_summary_by_construction_type_weekly_ua stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for facility_summary_by_construction_type_weekly_ua

CREATE TABLE source_smart.facility_summary_by_construction_type_weekly_ua (
	facility_id int4 NULL,
	week_start_date date NULL,
	vendor_id int4 NULL,
	facility_name varchar(50) NULL,
	sourcing_id varchar(50) NULL,
	country varchar(50) NULL,
	performance_score_90d numeric NULL,
	utilization_90d varchar(50) NULL,
	geo_political_risk numeric NULL,
	sustainability_score_90d numeric NULL,
	store_code varchar(50) NULL,
	otd_score_90d numeric NULL,
	quality_score_90d numeric NULL,
	fill_rate_score_90d varchar(50) NULL,
	schedule_adherence_90d varchar(50) NULL,
	compliance_tier varchar(50) NULL,
	labor_risk varchar(50) NULL
);

--changeset mayank.mukundam@impactanalytics.co:facility_summary_by_construction_type_weekly_ua_add_columns stripComments:false splitStatements:false context:Release_1_1 labels:liquibase_project_start
--comment: add columns to facility_summary_by_construction_type_weekly_ua
ALTER TABLE source_smart.facility_summary_by_construction_type_weekly_ua ADD COLUMN subregion varchar;
ALTER TABLE source_smart.facility_summary_by_construction_type_weekly_ua ADD COLUMN is_updated bool;
ALTER TABLE source_smart.facility_summary_by_construction_type_weekly_ua ADD COLUMN is_active bool;
ALTER TABLE source_smart.facility_summary_by_construction_type_weekly_ua ADD COLUMN created_at timestamptz;
ALTER TABLE source_smart.facility_summary_by_construction_type_weekly_ua ADD COLUMN updated_at timestamptz;