--liquibase formatted sql
--changeset liquibase:dc_store_transit_master stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for dc_store_transit_master
--inventory smart
CREATE TABLE "inventory_smart".dc_store_transit_master (
source varchar NOT NULL,
dest varchar NOT NULL,
transleadtime int8 NULL,
shipping_day varchar null,
CONSTRAINT dc_store_transit_master_pk PRIMARY KEY (source,dest)
);