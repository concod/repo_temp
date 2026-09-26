--liquibase formatted sql
--changeset liquibase:st_kpi_schema stripComments:false splitStatements:false context:Release_1_0 labels:0063
--comment: initial changeset for st_kpi schema

CREATE TABLE inventory_smart.st_kpi (
    l0_code varchar NOT NULL,
    l0_name varchar NOT NULL,
    l1_name varchar NOT NULL,
    l3_name varchar NOT NULL,
    l4_name varchar NOT NULL,
    hierarchy varchar NOT NULL,
    st INT4 NULL
    );

--changeset swapnil-bhange:st_kpi_schema_v2 stripComments:false splitStatements:false context:Release_1_0 labels:0064
--comment: added new columns for st_kpi schema

Alter table inventory_smart.st_kpi ADD COLUMN product_code varchar;
Alter table inventory_smart.st_kpi ADD COLUMN primary_sku varchar;
Alter table inventory_smart.st_kpi ADD COLUMN qty INT4;
Alter table inventory_smart.st_kpi ADD COLUMN carry_inv float4;
ALTER table inventory_smart.st_kpi DROP column if exists st;
