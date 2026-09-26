--liquibase formatted sql
--changeset sriraj.varanasi@impactanalytics.co:oms_sl_coeff stripComments:false splitStatements:false context:Release_1_0 ignore:false labels:briscoes_oms_sl_coeff
--comment: initial changeset for oms_sl_coeff

CREATE TABLE IF NOT EXISTS inventory_smart.oms_sl_coeff (
	service_level float8 NULL,
	coeff float8 NULL
);
