--liquibase formatted sql
--changeset liquibase:vendor_summary_weekly stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for vendor_summary_weekly
CREATE TABLE source_smart.vendor_summary_weekly (
	vendor_id varchar(255) NOT NULL,
	week_start_date date NOT NULL,
	vendor_name varchar(255) NULL,
	country varchar(255) NULL,
	relationship varchar(255) NULL,
	compliance varchar(255) NULL,
	esg_rating varchar(255) NULL,
	performance_score_90d numeric NULL,
	otif_score_90d numeric NULL,
	quality_score_90d numeric NULL,
	fill_rate_score_90d numeric NULL,
	schedule_adherence_90d numeric NULL,
	store_code varchar NULL,
	CONSTRAINT vsw_pk PRIMARY KEY (vendor_id, week_start_date),
	CONSTRAINT vendor_summary_weekly_store_master_fk FOREIGN KEY (store_code) REFERENCES source_smart.store_master(store_code) ON DELETE CASCADE,
	CONSTRAINT vendor_summary_weekly_vendor_master_fk FOREIGN KEY (vendor_id) REFERENCES source_smart.vendor_master(vendor_id) ON DELETE CASCADE
);
CREATE INDEX idx_vendor_summary_weekly_vendor_date ON source_smart.vendor_summary_weekly USING btree (vendor_id, week_start_date DESC);
--changeset genuine.basil@impactanalytics.co:vendor_summary_weekly_region stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: add region column to vendor_summary_weekly
ALTER TABLE source_smart.vendor_summary_weekly ADD COLUMN region VARCHAR(255);
