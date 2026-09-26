--liquibase formatted sql
--changeset liquibase:oms_constraints_ordering stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for oms_constraints_ordering
CREATE TABLE inventory_smart.oms_constraints_ordering (
	product_code varchar NOT NULL,
	vendor_code varchar NOT NULL,
	min_order_quantity int4 NOT NULL,
	max_order_quantity int4 NOT NULL,
	created_by varchar NOT NULL,
	created_at timestamptz NOT NULL,
	updated_by varchar NULL,
	updated_at timestamptz NULL,
	CONSTRAINT check_oms_constraints_ordering CHECK ((min_order_quantity <= max_order_quantity)),
	CONSTRAINT pk_oms_constraints_ordering PRIMARY KEY (vendor_code, product_code)
);
