--liquibase formatted sql
--changeset liquibase:tb_inventory_po stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for tb_inventory_po
CREATE TABLE "global"."tb_inventory_po" (
    s0_id int4 NULL,
    s0_name varchar(50) NULL,
    s1_id int4 NULL,
    s1_name varchar(50) NULL,
    style_cuq varchar(50) NULL,
    product_id int8 NULL,
    store_code int4 NULL,
    po_date date NULL,
    po_order int4 NULL
)
;
