--liquibase formatted sql
--changeset sairaghunath.k:oms_sl_coeff stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment:added if not exists for oms_sl_coeff
CREATE TABLE IF NOT EXISTS inventory_smart.oms_sl_coeff (
	service_level float8 NULL,
	coeff float8 NULL
);