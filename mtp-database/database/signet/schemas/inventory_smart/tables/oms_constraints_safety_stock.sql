--liquibase formatted sql
--changeset liquibase:oms_constraints_safety_stock stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for oms_constraints_safety_stock
CREATE TABLE inventory_smart.oms_constraints_safety_stock (
	id serial4 NOT NULL,
	product_code varchar NOT NULL,
	loc_code varchar NOT NULL,
	safety_stock_method varchar NOT NULL,
	stock_units int4 NOT NULL,
	service_level_pct int4 NOT NULL,
	max_stock_units int4 NOT NULL,
	inventory_hold int4 NOT NULL,
	created_by varchar NOT NULL,
	created_at timestamptz NOT NULL,
	updated_by varchar NULL,
	updated_at timestamptz NULL,
	CONSTRAINT pk_oms_constraints_safety_stock PRIMARY KEY (loc_code, product_code)
);