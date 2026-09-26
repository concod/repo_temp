--liquibase formatted sql
--changeset liquibase:vendor_summary_by_construction_type_weekly stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for vendor_summary_by_construction_type_weekly
CREATE TABLE source_smart.vendor_summary_by_construction_type_weekly (
	vendor_id varchar(255) NOT NULL,
	construction_type_id varchar(255) NOT NULL,
	week_start_date date NOT NULL,
	performance_score_90d numeric NULL,
	otif_score_90d numeric NULL,
	quality_score_90d numeric NULL,
	fill_rate_score_90d numeric NULL,
	schedule_adherence_90d numeric NULL,
	store_code varchar NULL,
	CONSTRAINT vsct_pk PRIMARY KEY (vendor_id, construction_type_id, week_start_date),
	CONSTRAINT vendor_summary_by_construction_type_weekly_construction_type_ma FOREIGN KEY (construction_type_id) REFERENCES source_smart.construction_type_master(construction_type_id) ON DELETE CASCADE,
	CONSTRAINT vendor_summary_by_construction_type_weekly_store_master_fk FOREIGN KEY (store_code) REFERENCES source_smart.store_master(store_code) ON DELETE CASCADE,
	CONSTRAINT vendor_summary_by_construction_type_weekly_vendor_master_fk FOREIGN KEY (vendor_id) REFERENCES source_smart.vendor_master(vendor_id) ON DELETE CASCADE
);