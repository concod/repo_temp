--liquibase formatted sql
--changeset liquibase:oms_constraints_shipment stripComments:false splitStatements:false context:initial_release labels:liquibase_project_start
--comment: initial changeset for oms_constraints_shipment

CREATE TABLE IF NOT EXISTS inventory_smart.oms_constraints_shipment (
	product_code varchar(50) NOT NULL,
	loc_code varchar(50) DEFAULT 'none'::character varying NOT NULL,
	channel varchar(50) NOT NULL,
	vendor_code varchar(50) NOT NULL,
	vendor_name varchar(50) NULL,
	min_replenishment_quantity int4 DEFAULT 0 NOT NULL,
	max_replenishment_quantity int4 DEFAULT 99999 NOT NULL,
	order_multiple int4 DEFAULT 1 NOT NULL,
	created_by int4 NULL,
	created_at timestamptz NULL,
	updated_by int4 NULL,
	updated_at timestamptz NULL,
	column_updated varchar(255) NULL,
	id serial4 NOT NULL,
	moq_tolerance int4 DEFAULT 100 NULL,
	CONSTRAINT check_oms_constraints_ordering CHECK ((min_replenishment_quantity <= max_replenishment_quantity)),
	CONSTRAINT pk_oms_constraints_ordering PRIMARY KEY (product_code, loc_code, channel, vendor_code)
);
