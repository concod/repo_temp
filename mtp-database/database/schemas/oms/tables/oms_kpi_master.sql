--liquibase formatted sql
--changeset sriraj.varanasi@impactanalytics.co:oms_kpi_master stripComments:false splitStatements:false context:Release_1_0 ignore:false labels:briscoes_oms_kpi_master
--comment: initial changeset for oms_kpi_master

CREATE TABLE IF NOT EXISTS oms.oms_kpi_master (
	product_code varchar NULL,
	loc_code varchar NULL,
	kpi_name varchar NULL,
	kpi_value float8 NULL,
	channel varchar NULL
);

--changeset raja.duraisamy@impactanalytics.co:oms_kpi_master_performance_indexes_1 stripComments:false splitStatements:false context:performance_optimization labels:OMS_PERFORMANCE_INDEXES
--comment: Performance indexes for oms_kpi_master based on query analysis
CREATE INDEX IF NOT EXISTS idx_oms_kpi_master_product_loc ON oms.oms_kpi_master(product_code, loc_code);
CREATE INDEX IF NOT EXISTS idx_oms_kpi_master_product_loc_channel ON oms.oms_kpi_master(product_code, loc_code, channel);

--changeset raja.duraisamy@impactanalytics.co:index_oms_kpi_master_drop_indexes stripComments:false splitStatements:false context:generic_schema_update labels:GENERIC_SCHEMA_UPDATE
--comment: Index for oms_kpi_master
DROP INDEX IF EXISTS oms.idx_oms_kpi_master_product_loc;