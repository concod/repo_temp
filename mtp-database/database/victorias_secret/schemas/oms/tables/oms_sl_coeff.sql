--liquibase formatted sql
--changeset liquibase:oms_sl_coeff1 stripComments:false splitStatements:false context:Release_1 labels:VS-353
--comment: initial changeset for oms_sl_coeff
CREATE TABLE IF NOT EXISTS inventory_smart.oms_sl_coeff (
	service_level float8 NULL,
	coeff float8 NULL
);