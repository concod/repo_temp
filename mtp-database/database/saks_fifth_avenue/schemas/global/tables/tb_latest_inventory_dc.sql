--liquibase formatted sql
--changeset liquibase:tb_latest_inventory_dc stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for tb_latest_inventory_dc
CREATE TABLE "global"."tb_latest_inventory_dc" (
    s0_id int4 NULL,
    s0_name varchar(50) NULL,
    s1_id int4 NULL,
    s1_name varchar(50) NULL,
    style_cuq text NULL,
    product_id int4 NULL,
    clearance_indicator int4 NULL,
    date varchar(50) NULL,
    oh int4 NULL,
    it int4 NULL,
    oo int4 NULL,
    vendor_oo int4 NULL,
    total_inventory int4 NULL
)
;

--changeset liquibase:kumaran_2 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for tb_latest_inventory_dc change datatype
ALTER TABLE "global".tb_latest_inventory_dc ALTER COLUMN "date" TYPE DATE USING TO_DATE("date", 'YYYY-MM-DD');