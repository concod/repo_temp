--liquibase formatted sql
--changeset sidhartha.c@impactanalytics.co:oms_constraints_status_1 stripComments:false splitStatements:false context:Release_1_0 ignore:false labels:briscoes_oms_constraints_status_1
--comment: initial changeset for oms_constraints_status_1

CREATE TABLE IF NOT EXISTS inventory_smart.oms_constraints_status (
	product_code varchar(256) NOT NULL,
	channel varchar(256) NOT NULL,
	store_code varchar(256) NULL,
	vendor_code varchar(256) NOT NULL,
	vendor_name varchar(256) NULL,
	status varchar(256) NULL,
	preferred_status varchar(256) NULL,
	created_by int4 NULL,
	created_at timestamptz NULL,
	updated_by int4 NULL,
	updated_at timestamptz NULL,
	column_updated varchar(256) NULL,
	id serial4 NOT NULL,
	CONSTRAINT pk_oms_constraints_status PRIMARY KEY (product_code, channel, vendor_code)
);