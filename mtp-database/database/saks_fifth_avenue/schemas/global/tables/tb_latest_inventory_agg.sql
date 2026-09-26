--liquibase formatted sql
--changeset liquibase:tb_latest_inventory_agg stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for tb_latest_inventory_agg
CREATE TABLE "global"."tb_latest_inventory_agg" (
    parent_id int8 NULL,
    product_id int4 NULL,
    oh int4 NULL,
    it int4 NULL,
    oo int4 NULL,
    vendor_oo int4 NULL,
    total_inventory int4 NULL
)
;