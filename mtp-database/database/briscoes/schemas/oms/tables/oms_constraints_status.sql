--liquibase formatted sql
--changeset sriraj.varanasi@impactanalytics.co:oms_constraints_status stripComments:false splitStatements:false context:Release_1_0 ignore:false labels:briscoes_oms_constraints_status
--comment: initial changeset for oms_constraints_status

CREATE TABLE IF NOT EXISTS inventory_smart.oms_constraints_status (
	product_code varchar(256) NOT NULL,
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
	channel varchar NOT NULL,
	CONSTRAINT pk_oms_constraints_status PRIMARY KEY (product_code, channel, vendor_code)
);


--changeset samarjit.mazumder@impactanalytics.co:drop_not_null_constraint stripComments:false splitStatements:false context:Release_1_0 labels:drop_not_null_constraint
--comment: drop_not_null_constraint
ALTER TABLE inventory_smart.oms_constraints_status ADD COLUMN l6_name VARCHAR NULL;

--changeset samarjit.mazumder@impactanalytics.co:add_column_vendor_location stripComments:false splitStatements:false context:Release_1_0 labels:add_column_vendor_location
--comment: add_column_vendor_location
alter table inventory_smart.oms_constraints_status add column if not exists vendor_location  varchar NULL;