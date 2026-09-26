--liquibase formatted sql
--changeset liquibase:oms_constraints_safety_stock_1 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_starts
--comment: initial changeset for oms_constraints_safety_stocks

CREATE TABLE IF NOT EXISTS inventory_smart.oms_constraints_safety_stock (
	id serial4 NOT NULL,
	channel varchar NULL,
	article varchar NOT NULL,
	loc_code varchar NOT NULL,
	vendor_code varchar NULL,
	vendor_name varchar NULL,
	safety_stock_method varchar NULL,
	safety_stock_twos int4 NULL,
	demand_twos int4 DEFAULT 8 NULL,
	service_level_pct int4 NULL,
	stock_units int4 NULL,
	created_by int4 NULL,
	created_at timestamptz NULL,
	updated_by int4 NULL,
	updated_at timestamptz NULL,
	CONSTRAINT pk_oms_constraints_safety_stock PRIMARY KEY (article, loc_code)
);

