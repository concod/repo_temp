--liquibase formatted sql
--changeset liquibase:oms_constraints_status_update2 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start_update2
--comment: initial changeset for oms_constraints_status_update2

CREATE TABLE IF NOT EXISTS inventory_smart.oms_constraints_status (
	product_code varchar(50) NOT NULL,
	channel varchar(50) NOT NULL,
	store_code varchar(50) DEFAULT '-'::character varying NOT NULL,
	vendor_code varchar(50) NOT NULL,
	vendor_name varchar(50) NULL,
	status varchar(50) NULL,
	preferred_status varchar(50) NULL,
	created_by int4 NULL,
	created_at timestamptz NULL,
	updated_by int4 NULL,
	updated_at timestamptz NULL,
	column_updated varchar(50) NULL,
	id serial4 NOT NULL,
	CONSTRAINT pk_oms_constraints_status PRIMARY KEY (product_code, channel, vendor_code, store_code)
);

--changeset pradeep.kumar:dropping_store_code stripComments:false splitStatements:false context:Release_1_0 labels:dropping_store_code_column
--comment: dropping store_code from table

alter table inventory_smart.oms_constraints_status 
drop constraint if EXISTS pk_oms_constraints_status;

alter table inventory_smart.oms_constraints_status 
add constraint pk_oms_constraints_status PRIMARY KEY (product_code, channel, vendor_code);

alter table inventory_smart.oms_constraints_status
drop column if exists store_code;