--liquibase formatted sql
--changeset liquibase:tb_inventory_po stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for tb_inventory_po
CREATE TABLE "global"."tb_inventory_po" (
    s0_id int4 NULL,
    s0_name varchar(50) NULL,
    s1_id int4 NULL,
    s1_name varchar(50) NULL,
    style_cuq varchar(50) NULL,
    product_id int4 NULL,
    store_code int4 NULL,
    po_date date NULL,
    po_order int4 NULL
)
;

--changeset liquibase:kumaran_2 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for tb_inventory_po change in datatype
ALTER TABLE "global".tb_inventory_po ALTER COLUMN product_id TYPE INT8;