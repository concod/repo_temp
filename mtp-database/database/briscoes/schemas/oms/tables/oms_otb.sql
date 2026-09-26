--liquibase formatted sql
--changeset samarjit.mazumder@impactanalytics.co.co:oms_otb stripComments:false splitStatements:false context:Release_1_0 ignore:false labels:briscoes_oms_otb
--comment: initial changeset for oms_otb

CREATE TABLE IF NOT EXISTS inventory_smart.oms_otb (
	id serial4 NOT NULL,
	product_code varchar(50) NOT NULL,
	loc_code varchar(50) NOT NULL,
	channel varchar(50) NOT NULL,
	fiscal_year_week int4 NOT NULL,
	mfp_units float4 NULL,
	approved_otb float4 NULL,
	total_units float4 NULL,
	otb float4 NULL,
	recom_receipts float4 NULL,
	fiscal_year_week_receipt int4 NULL,
	CONSTRAINT pk_oms_otb PRIMARY KEY (product_code, loc_code, channel, fiscal_year_week)
);