--liquibase formatted sql
--changeset sriraj.varanasi@impactanalytics.co:oms_kpi_master stripComments:false splitStatements:false context:Release_1_0 ignore:false labels:briscoes_oms_kpi_master
--comment: initial changeset for oms_kpi_master

CREATE TABLE IF NOT EXISTS inventory_smart.oms_po_master (
	order_id varchar NULL,
	po_id varchar NULL,
	asn_id varchar NULL,
	product_code varchar NULL,
	loc_code varchar NULL,
	channel varchar NULL,
	projected_delivery_date date NULL,
	fiscal_year_week int4 NULL,
	pseudo_po int4 NULL,
	created_by int4 NULL,
	created_at timestamp NULL,
	updated_by int4 NULL,
	updated_at timestamp NULL,
	column_updated varchar NULL,
	oo int4 NULL,
	it int4 NULL
);