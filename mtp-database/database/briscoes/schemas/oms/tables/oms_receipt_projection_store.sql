--liquibase formatted sql
--changeset kanishka.parashar@impactanalytics.co:oms_receipt_projection_store stripComments:false splitStatements:false context:Release_1_0 ignore:false labels:oms_receipt_projection_store
--comment: initial changeset for oms_receipt_projection_store

CREATE TABLE IF NOT EXISTS inventory_smart.oms_receipt_projection_store (
	article varchar NULL,
	size_desc varchar NULL,
	product_code varchar NULL,
	vendor_name varchar NULL,
	vendor_code varchar NULL,
	store_code varchar NULL,
	channel varchar NULL,
	fiscal_year_month int4 NULL,
	fiscal_month_name varchar NULL,
	fiscal_year int4 NULL,
	receipt_quantity float8 NULL,
	receipt_quantity_cost float8 NULL,
	receipt_raw_roq float8 NULL,
	receipt_raw_roq_cost float8 NULL,
	receipt_roq_constrained int4 NULL,
	receipt_roq_constrained_cost float8 NULL,
	approved_quantity float8 NULL,
	approved_quantity_cost float8 NULL,
	committed_quantity float8 NULL,
	committed_quantity_cost float8 NULL
);