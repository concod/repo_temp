--liquibase formatted sql
--changeset liquibase:oms_otb_recreate_cb_change stripComments:false splitStatements:false context:Release_1_0 labels:MTP-63841_update2
--comment: initial changeset for oms create otb

CREATE TABLE IF NOT EXISTS  inventory_smart.oms_otb (
	id serial4 NOT NULL,
	product_code varchar(100) NOT NULL,
	loc_code varchar(100) NOT NULL,
	channel varchar(100) NOT NULL,
	fiscal_year_week int4 NOT NULL,
	mfp_units float4 NULL,
	approved_otb float4 NULL,
	total_units float4 NULL,
	otb float4 NULL,
	recom_receipts float4 NULL,
	CONSTRAINT pk_oms_otb PRIMARY KEY (product_code, loc_code, channel, fiscal_year_week)
);