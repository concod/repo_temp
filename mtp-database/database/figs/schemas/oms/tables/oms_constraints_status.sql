--liquibase formatted sql
--changeset liquibase:oms_constraints_status_3 stripComments:false splitStatements:false context:initial_release labels:liquibase_project_starts
--comment: initial changeset for oms_constraints_status1

CREATE TABLE IF NOT EXISTS inventory_smart.oms_constraints_status (
	id int NULL,
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

CREATE SEQUENCE IF NOT EXISTS inventory_smart.oms_constraints_status_new_id_seq
	INCREMENT BY 1
	MINVALUE 1
	MAXVALUE 2147483647
	START 1
	CACHE 1
	NO CYCLE;
    
ALTER TABLE inventory_smart.oms_constraints_status
ALTER COLUMN id SET DEFAULT nextval('inventory_smart.oms_constraints_status_new_id_seq'::regclass);