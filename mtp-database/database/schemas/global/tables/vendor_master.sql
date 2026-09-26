--liquibase formatted sql
--changeset liquibase:vendor_master stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for vendor_master
CREATE TABLE "global".vendor_master (
	vendor_code varchar NOT NULL,
	vendor_name varchar NULL,
	capacity int4 NULL,
	created_by int4 NULL,
	created_at timestamp NOT NULL DEFAULT now(),
	vendor_currency varchar NULL,
	currency varchar(50) NULL,
	CONSTRAINT vendor_master_pk PRIMARY KEY (vendor_code),
	CONSTRAINT vendor_master_un UNIQUE (vendor_code, vendor_name)
);
