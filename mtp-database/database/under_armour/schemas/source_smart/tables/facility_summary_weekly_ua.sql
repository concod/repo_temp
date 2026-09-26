--liquibase formatted sql
--changeset liquibase:facility_summary_weekly_ua stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for facility_summary_weekly_ua

CREATE TABLE source_smart.facility_summary_weekly_ua (
	facility_id int4 NULL,
	vendor_id int4 NULL,
	week_start_date date NULL,
	facility_name varchar(50) NULL,
	country varchar(50) NULL,
	performance_score_90d numeric NULL,
	utilization_90d numeric NULL,
	geo_political_risk numeric NULL,
	store_code varchar(50) NULL,
	compliance_tier varchar(50) NULL,
	labor_risk varchar(50) NULL
);

--changeset mayankmukundam:facility_summary_weekly_ua_add_columns stripComments:false splitStatements:false context:Release_1_1 labels:liquibase_project_start
--comment: add new columns to facility_summary_weekly_ua

ALTER TABLE source_smart.facility_summary_weekly_ua ADD COLUMN city varchar;
ALTER TABLE source_smart.facility_summary_weekly_ua ADD COLUMN worker_count_range varchar;
ALTER TABLE source_smart.facility_summary_weekly_ua ADD COLUMN quality_certification varchar;
ALTER TABLE source_smart.facility_summary_weekly_ua ADD COLUMN esg_rating varchar;
ALTER TABLE source_smart.facility_summary_weekly_ua ADD COLUMN region varchar;
ALTER TABLE source_smart.facility_summary_weekly_ua ADD COLUMN is_updated bool;
ALTER TABLE source_smart.facility_summary_weekly_ua ADD COLUMN is_active bool;
ALTER TABLE source_smart.facility_summary_weekly_ua ADD COLUMN created_at timestamptz;
ALTER TABLE source_smart.facility_summary_weekly_ua ADD COLUMN updated_at timestamptz;