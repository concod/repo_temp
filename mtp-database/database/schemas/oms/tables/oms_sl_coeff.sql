--liquibase formatted sql
--changeset sriraj.varanasi@impactanalytics.co:oms_sl_coeff stripComments:false splitStatements:false context:Release_1_0 ignore:false labels:briscoes_oms_sl_coeff
--comment: initial changeset for oms_sl_coeff

CREATE TABLE IF NOT EXISTS oms.oms_sl_coeff (
	service_level float8 NULL,
	coeff float8 NULL
);

--changeset raja.duraisamy@impactanalytics.co:oms_sl_coeff_performance_indexes_1 stripComments:false splitStatements:false context:performance_optimization labels:OMS_PERFORMANCE_INDEXES
--comment: Performance indexes for oms_sl_coeff based on query analysis
CREATE INDEX IF NOT EXISTS idx_oms_sl_coeff_service_level ON oms.oms_sl_coeff(service_level);
CREATE INDEX IF NOT EXISTS idx_oms_sl_coeff_coeff ON oms.oms_sl_coeff(coeff);