--liquibase formatted sql
--changeset liquibase:oms_otb stripComments:false splitStatements:false context:initial_release labels:liquibase_project_start
--comment: initial changeset for oms_otb

CREATE TABLE IF NOT EXISTS inventory_smart.oms_otb (
	product_code varchar(50) NULL,
	loc_code varchar(50) NULL,
	channel varchar(50) NULL,
	fiscal_year_week int4 NULL,
	mfp_units int4 NULL,
	approved_otb int4 NULL,
	total_units int4 NULL,
	otb int4 NULL,
	recom_receipts int4 NULL
);
