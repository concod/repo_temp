--liquibase formatted sql
--changeset bhavya.visaria@impactanalytics.co.co:oms_otb stripComments:false splitStatements:false context:Release_1_0 ignore:false labels:briscoes_oms_orders_recommended
--comment: initial changeset for oms_otb

CREATE TABLE IF NOT EXISTS oms.oms_otb (
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

--changeset raja.duraisamy@impactanalytics.co:oms_otb_performance_indexes_1 stripComments:false splitStatements:false context:performance_optimization labels:OMS_PERFORMANCE_INDEXES
--comment: Performance indexes for oms_otb based on query analysis
CREATE INDEX IF NOT EXISTS idx_oms_otb_product_loc ON oms.oms_otb(product_code, loc_code);
CREATE INDEX IF NOT EXISTS idx_oms_otb_product_loc_fyw ON oms.oms_otb(product_code, loc_code, fiscal_year_week);
CREATE INDEX IF NOT EXISTS idx_oms_otb_product_loc_channel ON oms.oms_otb(product_code, loc_code, channel);

--changeset raja.duraisamy@impactanalytics.co:oms_otb_add_missing_columns stripComments:false splitStatements:false context:generic_schema_update labels:GENERIC_SCHEMA_UPDATE
--comment: Add missing generic schema columns to oms_otb
ALTER TABLE oms.oms_otb ADD COLUMN IF NOT EXISTS fiscal_year_week_receipt int4 NULL;

--changeset raja.duraisamy@impactanalytics.co:index_oms_otb_drop_indexes stripComments:false splitStatements:false context:generic_schema_update labels:GENERIC_SCHEMA_UPDATE
--comment: Index for oms_otb
DROP INDEX IF EXISTS oms.idx_oms_otb_product_loc;
DROP INDEX IF EXISTS oms.idx_oms_otb_product_loc_fyw;
DROP INDEX IF EXISTS oms.idx_oms_otb_product_loc_channel;
