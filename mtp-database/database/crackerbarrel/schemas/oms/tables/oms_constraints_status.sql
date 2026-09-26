--liquibase formatted sql
--changeset liquibase:oms_constraints_status_not_exists_added stripComments:false splitStatements:false context:Release_1_0 labels:oms_constraints_status_not_exists_added
--comment: initial changeset for oms_constraints_status_not_exists_added


CREATE TABLE IF NOT EXISTS inventory_smart.oms_constraints_status (
	product_code varchar(100) NOT NULL,
	channel varchar(100) NOT NULL,
	vendor_code varchar(100) NOT NULL,
	vendor_name varchar(100) NULL,
	status varchar(100) NULL,
	preferred_status varchar(100) NULL,
	created_by int4 NULL,
	created_at timestamptz NULL,
	updated_by int4 NULL,
	updated_at timestamptz NULL,
	column_updated varchar(100) NULL,
	id serial4 NOT NULL,
	l6_name varchar NULL,
	CONSTRAINT pk_oms_constraints_status PRIMARY KEY (product_code, channel)
);