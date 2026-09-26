--liquibase formatted sql
--changeset liquibase:oms_constraints_status stripComments:false splitStatements:false context:initial_release labels:liquibase_project_start
--comment: initial changeset for oms_constraints_status

CREATE SEQUENCE IF NOT EXISTS inventory_smart.oms_constraints_status_new_id_seq
	INCREMENT BY 1
	MINVALUE 1
	MAXVALUE 2147483647
	START 1
	CACHE 1
	NO CYCLE;

CREATE TABLE IF NOT EXISTS inventory_smart.oms_constraints_status (
	id int8 DEFAULT nextval('inventory_smart.oms_constraints_status_new_id_seq'::regclass) NULL,
	product_code varchar NOT NULL,
	vendor_code varchar(50) NULL,
	vendor_name varchar NULL,
	status varchar(50) NULL,
	preferred_status varchar(50) NULL,
	created_by int4 NULL,
	created_at timestamptz NULL,
	updated_by int4 NULL,
	updated_at timestamptz NULL,
	CONSTRAINT pk_oms_constraints_status PRIMARY KEY (product_code)
);

