--liquibase formatted sql
--changeset liquibase:vendor_master_cb stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for vendor_master_cb
-- inventory smart folder
CREATE TABLE "inventory_smart".vendor_master_cb (
vendor_code varchar NOT NULL,
vendor_name varchar NULL,
city varchar NULL,
state varchar NULL,
country varchar NULL,
addr_type varchar NOT NULL,
primary_addr_ind varchar NULL,
CONSTRAINT vendor_master_cb_pk PRIMARY KEY (vendor_code,addr_type)
);
