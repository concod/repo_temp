--liquibase formatted sql
--changeset liquibase:oms_qc_days stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for oms_qc_days
CREATE TABLE IF NOT EXISTS inventory_smart.oms_qc_days (
	product_code varchar NULL,
	vendor_code varchar NULL,
	dc_id varchar NULL,
	vlt_week int4 NULL,
	qc_days int4 NULL
);