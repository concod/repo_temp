--liquibase formatted sql
--changeset liquibase:oms_constraints_safety_stock stripComments:false splitStatements:false context:Release_1_0 labels:oms_constraints_safety_stock
--comment: initial changeset for oms_constraints_safety_stock

CREATE TABLE IF NOT EXISTS inventory_smart.oms_constraints_safety_stock (
	article varchar(100) NOT NULL,
	loc_code varchar(100) DEFAULT 'none'::character varying NOT NULL,
	channel varchar(100) NOT NULL,
	vendor_code varchar(100) NOT NULL,
	vendor_name varchar(100) NULL,
	safety_stock_method varchar(100) DEFAULT 'service level'::character varying NULL,
	safety_stock_twos int4 NULL,
	demand_twos int4 DEFAULT 4 NULL,
	service_level_pct int4 NULL,
	stock_units int4 NULL,
	created_by int4 DEFAULT 112 NULL,
	created_at timestamptz NULL,
	updated_by int4 NULL,
	updated_at timestamptz NULL,
	column_updated varchar(100) NULL,
	id serial4 NOT NULL,
	CONSTRAINT pk_oms_constraints_safety_stock PRIMARY KEY (article, loc_code, channel)
);