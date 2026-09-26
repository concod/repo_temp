--liquibase formatted sql
--changeset liquibase:facility_summary_weekly stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for facility_summary_weekly
CREATE TABLE source_smart.facility_summary_weekly (
	facility_id varchar(255) NOT NULL,
	vendor_id varchar(255) NULL,
	week_start_date date NOT NULL,
	facility_name varchar(255) NULL,
	country varchar(255) NULL,
	performance_score_90d numeric NULL,
	utilization_90d numeric NULL,
	geo_political_risk numeric NULL,
	store_code varchar NULL,
	compliance_tier varchar(50) NULL,
	labor_risk varchar(50) NULL,
	CONSTRAINT fmw_pk PRIMARY KEY (facility_id, week_start_date),
	CONSTRAINT facility_summary_weekly_facility_master_fk FOREIGN KEY (facility_id) REFERENCES source_smart.facility_master(facility_id) ON DELETE CASCADE,
	CONSTRAINT facility_summary_weekly_store_master_fk FOREIGN KEY (store_code) REFERENCES source_smart.store_master(store_code) ON DELETE CASCADE,
	CONSTRAINT facility_summary_weekly_vendor_master_fk FOREIGN KEY (vendor_id) REFERENCES source_smart.vendor_master(vendor_id) ON DELETE CASCADE
);