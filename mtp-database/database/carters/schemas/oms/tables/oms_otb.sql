--liquibase formatted sql
--changeset liquibase:oms_otb_update2 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start_update2
--comment: initial changeset for oms_otb_update2

CREATE TABLE IF NOT EXISTS inventory_smart.oms_otb (
    id serial4 NOT NULL,
	product_code varchar(50) NULL,
	loc_code varchar(50) NULL,
	channel varchar(50) NULL,
	fiscal_year_week int4 NULL,
	mfp_units int4 NULL,
	approved_otb int4 NULL,
	total_units int4 NULL,
	otb int4 NULL,
	recom_receipts int4 NULL,
    CONSTRAINT pk_oms_otb PRIMARY KEY (product_code, loc_code, channel, fiscal_year_week)
);

--changeset pradeep.kumar:datatype_change stripComments:false splitStatements:false context:Release_1_0 labels:datatype_change
--comment: changing datatype to float

ALTER TABLE inventory_smart.oms_otb ALTER COLUMN mfp_units TYPE float4 USING mfp_units::float4;
ALTER TABLE inventory_smart.oms_otb ALTER COLUMN approved_otb TYPE float4 USING approved_otb::float4;
ALTER TABLE inventory_smart.oms_otb ALTER COLUMN total_units TYPE float4 USING total_units::float4;
ALTER TABLE inventory_smart.oms_otb ALTER COLUMN otb TYPE float4 USING otb::float4;
ALTER TABLE inventory_smart.oms_otb ALTER COLUMN recom_receipts TYPE float4 USING recom_receipts::float4;

--changeset pradeep.kumar:fyw_receipt stripComments:false splitStatements:false context:initial_release labels:fyw_receipt
--comment: column_addn_fyw_receipt
ALTER TABLE inventory_smart.oms_otb ADD COLUMN if not exists fiscal_year_week_receipt int4;