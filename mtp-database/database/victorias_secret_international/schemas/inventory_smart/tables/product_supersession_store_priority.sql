--liquibase formatted sql
--changeset kanishka.parashar@impactanalytics.co:product_supersession_store_priority_intl stripComments:false splitStatements:false context:VS_inv_smart labels:supersession_mapping
--comment: initial changeset for product_supersession_store_priority intl

CREATE TABLE IF NOT EXISTS inventory_smart.product_supersession_store_priority (
	ps_code int4 NOT NULL,
	store varchar NULL,
	priority int4 NULL,
	updated_by varchar(50) NULL,
	updated_at timestamp NULL,
	created_by varchar(50) NULL,
	created_at timestamp NULL,
	CONSTRAINT product_supersession_store_priority_ps_code_fkey FOREIGN KEY (ps_code) REFERENCES inventory_smart.product_supersession_mapping(ps_code)
);