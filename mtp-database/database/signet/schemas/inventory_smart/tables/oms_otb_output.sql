--liquibase formatted sql
--changeset liquibase:oms_otb_output_1 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for oms_otb_output
CREATE TABLE IF NOT EXISTS inventory_smart.oms_otb_output (
	l2_name varchar NOT NULL,
	fiscal_year_month int4 NOT NULL,
	eligible_skus int4 NULL,
	approved_otb float4 NULL,
	otb float4 NULL,
	recom_receipts float4 NULL,
	mfp float4 NULL,
	total_cost float4 NULL,
	planning_ownership varchar NOT NULL,
	channel varchar NOT NULL,
	CONSTRAINT pk_oms_otb_output PRIMARY KEY (l2_name, planning_ownership, channel, fiscal_year_month)
);

--changeset kishan.patel:oms_otb_output_gap_remove stripComments:false splitStatements:false context:Release_1_0 labels:DAT-1122
--comment: initial changeset for oms_otb_output
ALTER TABLE inventory_smart.oms_otb_output ALTER COLUMN approved_otb TYPE float8;
ALTER TABLE inventory_smart.oms_otb_output ALTER COLUMN otb TYPE float8;
ALTER TABLE inventory_smart.oms_otb_output ALTER COLUMN recom_receipts TYPE float8;
ALTER TABLE inventory_smart.oms_otb_output ALTER COLUMN mfp TYPE float8;
ALTER TABLE inventory_smart.oms_otb_output ALTER COLUMN total_cost TYPE float8;