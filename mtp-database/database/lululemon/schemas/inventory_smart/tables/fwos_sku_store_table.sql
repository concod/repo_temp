--liquibase formatted sql
--changeset raghav.kirkol@impactanalytics.co:fwos_sku_store_new_24S stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset of fwos_sku_store_new_24



CREATE TABLE inventory_smart.fwos_sku_store_table (
    l0_name varchar NOT NULL,
    product_code varchar NOT NULL,
    store_code varchar NOT NULL,
    wos_oh_oo_it int4 NULL,
    wos_oh_oo  int4 NULL,
    wos_oh_it int4 NULL,
    wos_oh  int4 NULL,
    oh  int4 NULL,
    oo  int4 NULL,
    it  int4 NULL,
    total_inv  int4 NULL,
    sales int4 NULL,
    first_sales_date  date NULL,
    last_sales_date date NULL,
    weeks int4 NULL,
    ros float4 NULL,
    CONSTRAINT fwos_sku_store_table_un UNIQUE (l0_name, product_code, store_code)
) PARTITION BY LIST (l0_name);


--changeset raghav.kirkol@impactanalytics.co:fwos_sku_store_new_245 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset of fwos_sku_store_new_245
ALTER TABLE inventory_smart.fwos_sku_store_table RENAME COLUMN oh TO str_oh;
ALTER TABLE inventory_smart.fwos_sku_store_table RENAME COLUMN oo TO str_oo_unt;
ALTER TABLE inventory_smart.fwos_sku_store_table RENAME COLUMN it TO str_it;
ALTER TABLE inventory_smart.fwos_sku_store_table RENAME COLUMN total_inv TO tot_str_inv;

--changeset raghav.kirkol@impactanalytics.co:fwos_sku_store_new_246 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset of fwos_sku_store_new_246
ALTER TABLE inventory_smart.fwos_sku_store_table
    ALTER COLUMN str_oh TYPE float8,
    ALTER COLUMN str_oo_unt TYPE float8,
    ALTER COLUMN str_it TYPE float8,
    ALTER COLUMN tot_str_inv TYPE float8;

--changeset raghav.kirkol@impactanalytics.co:fwos_sku_store_new_247 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset of fwos_sku_store_new_247
ALTER TABLE inventory_smart.fwos_sku_store_table
    ADD COLUMN str_inv float8,
    ADD COLUMN str_oh_oo float8,
    ADD COLUMN str_oh_it float8,
    ADD COLUMN ata float8,
    ADD COLUMN total_predicted_qty float8,
    ADD COLUMN dc_oh float8,
    ADD COLUMN dc_oo float8,
    ADD COLUMN total_dc_inv float8,
    ADD COLUMN str_dc_wos float8,
    ADD COLUMN dc_wos_oh float8,
    ADD COLUMN dc_wos_oh_oo float8,
    ADD COLUMN dc_wos_oh_oo_it float8;