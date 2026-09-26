--liquibase formatted sql
--changeset mayank.mukundam:vendor_summary_by_construction_type_weekly_ua stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for vendor_summary_by_construction_type_weekly_ua
CREATE TABLE source_smart.vendor_summary_by_construction_type_weekly_ua (
	vendor_id int4 NULL,
	sourcing_id varchar(50) NULL,
	week_start_date varchar(50) NULL,
	store_code varchar(50) NULL,
	otd_score_90d float4 NULL,
	quality_score_90d float4 NULL,
	sustainability_score_90d float4 NULL,
	performance_score_90d float4 NULL
);


--changeset mayankmukundam:vendor_summary_by_construction_type_weekly_ua_add_columns stripComments:false splitStatements:false context:Release_1_1 labels:liquibase_project_start
--comment: add columns to vendor_summary_by_construction_type_weekly_ua
ALTER TABLE source_smart.vendor_summary_by_construction_type_weekly_ua ADD COLUMN is_updated bool;
ALTER TABLE source_smart.vendor_summary_by_construction_type_weekly_ua ADD COLUMN is_active bool;
ALTER TABLE source_smart.vendor_summary_by_construction_type_weekly_ua ADD COLUMN created_at timestamptz;
ALTER TABLE source_smart.vendor_summary_by_construction_type_weekly_ua ADD COLUMN updated_at timestamptz;