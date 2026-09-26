--liquibase formatted sql
--changeset liquibase:oms_constraints_audit stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for oms_constraints_audit
CREATE TABLE inventory_smart.oms_constraints_audit (
	id serial4 NOT NULL,
	product_code varchar NOT NULL,
	loc_code varchar NOT NULL,
	vendor_code varchar NOT NULL,
	column_name varchar NOT NULL,
	table_name varchar NOT NULL,
	old_value varchar NOT NULL,
	new_value varchar NOT NULL,
	updated_by varchar NULL,
	updated_at timestamptz NULL,
	fical_year_week int4 NULL,
	fiscal_year_month int4 NULL
);