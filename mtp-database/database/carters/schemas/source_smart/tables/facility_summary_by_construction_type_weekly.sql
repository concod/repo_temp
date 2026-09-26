--liquibase formatted sql
--changeset liquibase:facility_summary_by_construction_type_weekly stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for facility_summary_by_construction_type_weekly
CREATE TABLE source_smart.facility_summary_by_construction_type_weekly (
	facility_id varchar(255) NOT NULL,
	week_start_date date NOT NULL,
	vendor_id varchar(255) NULL,
	facility_name varchar(255) NULL,
	construction_type_id varchar(255) NULL,
	country varchar(255) NULL,
	performance_score_90d numeric NULL,
	utilization_90d numeric NULL,
	geo_political_risk numeric NULL,
	store_code varchar(255) NULL,
	otif_score_90d numeric NULL,
	quality_score_90d numeric NULL,
	fill_rate_score_90d numeric NULL,
	schedule_adherence_90d numeric NULL,
	compliance_tier numeric NULL,
	labor_risk varchar(50) NULL,
	CONSTRAINT fsctw_pk PRIMARY KEY (facility_id, week_start_date),
	CONSTRAINT fsctw_construction_type_master_fk FOREIGN KEY (construction_type_id) REFERENCES source_smart.construction_type_master(construction_type_id) ON DELETE CASCADE,
	CONSTRAINT fsctw_store_master_fk FOREIGN KEY (store_code) REFERENCES source_smart.store_master(store_code) ON DELETE CASCADE,
	CONSTRAINT fsctw_vendor_master_fk FOREIGN KEY (vendor_id) REFERENCES source_smart.vendor_master(vendor_id) ON DELETE CASCADE
);
--changeset genuine.basil@impactanalytics.co:facility_summary_by_construction_type_weekly_s0_id stripComments:false splitStatements:false context:Release_2_0 labels:liquibase_project_update
--comment:add s0_id to facility_summary_by_construction_type_weekly
ALTER TABLE source_smart.facility_summary_by_construction_type_weekly ADD COLUMN s0_id varchar(255) NULL;