--liquibase formatted sql
--changeset liquibase:tb_latest_inventory_1 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for tb_latest_inventory with if not exists
CREATE TABLE if not exists "global"."tb_latest_inventory" (
    s0_id int4 NULL,
    s0_name varchar(50) NULL,
    s1_id int4 NULL,
    s1_name varchar(50) NULL,
    store_id int4 NULL,
    style_cuq varchar(50) NULL,
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

--changeset liquibase:kumaran_1 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for tb_latest_inventory change datatype
ALTER TABLE "global".tb_latest_inventory ALTER COLUMN "date" TYPE DATE USING TO_DATE("date", 'YYYY-MM-DD');

--changeset kumaran.k@impactanalytics.co:index_tb_latest_inventory_v1 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: add new columns to index_tb_latest_inventory_v1 table
CREATE INDEX mkd_inv_prod_store_id_idx ON "global".tb_latest_inventory USING btree (product_id, store_id);

--changeset kumaran.k@impactanalytics.co:tb_latest_inventory_v6 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: datatype change to tb_latest_inventory_v6 table

ALTER TABLE "global".tb_latest_inventory
ADD clearance_indicator_rf int4 NULL,
ADD lifecycle_indicator_rf text NULL,
ADD st float8 NULL;

--changeset kumaran.k@impactanalytics.co:tb_latest_inventory_v7 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: new columns to tb_latest_inventory_v7 table

ALTER TABLE "global".tb_latest_inventory
ADD clearance_eligible int4 NULL;

--changeset kumaran.k@impactanalytics.co:tb_latest_inventory_v8 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: new columns to tb_latest_inventory_v8 table

ALTER TABLE "global".tb_latest_inventory
ADD age int4 NULL;