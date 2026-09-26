--liquibase formatted sql
--changeset liquibase:oms_po_master_1 stripComments:false splitStatements:false context:initial_release labels:liquibase_project_start
--comment: initial changeset for oms_po_master drop and new table

CREATE TABLE IF NOT EXISTS inventory_smart.oms_po_master (
	order_id varchar NULL,
	po_id varchar NULL,
	asn_id varchar NULL,
	product_code varchar NOT NULL,
	loc_code varchar NOT NULL,
	channel varchar NULL,
	projected_delivery_date date NULL,
	fiscal_year_week int4 NULL,
	oo int4 NULL,
	it int4 NULL,
	pseudo_po int4 NULL,
    quantity_ordered int4 NULL
);