--liquibase formatted sql
--changeset sidhartha.c@impactanalytics.co:oms_kpi_master_1 stripComments:false splitStatements:false context:Release_1_0 ignore:false labels:briscoes_oms_kpi_master_1
--comment: initial changeset for oms_kpi_master_1

CREATE TABLE IF NOT EXISTS inventory_smart.oms_kpi_master (
	product_code varchar NULL,
	loc_code varchar NULL,
	channel varchar NULL,
	kpi_name varchar NULL,
	kpi_value float8 NULL
);