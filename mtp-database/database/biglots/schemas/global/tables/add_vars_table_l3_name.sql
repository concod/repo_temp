--liquibase formatted sql
--changeset liquibase:event_master stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for build_product_store_mapping_schema
--rollback: SELECT 1
-- "global".add_vars_table_l3_name definition

-- Drop table

-- DROP TABLE "global".add_vars_table_l3_name;

CREATE TABLE "global".add_vars_table_l3_name (
            fiscal_year int8 NULL,
            fiscal_week int8 NULL,
            hierarchy_code int8 NULL,
            msrp float8 NULL,
            "cost" float8 NULL,
            coupon_discount_per_unit float8 NULL,
            oh_inv float8 NULL,
            perc_store_on_md float8 NULL ,
            md_flag int4 NULL,
            sku_count int8 NULL,
            start_flag int4 NULL,
            end_flag int4 NULL,
            sku_store_count_inv int8 NULL,
            perc_md_oh_inv float8 NULL
);
CREATE INDEX add_vars_table_l3_name_hierarchy_code_1501_idx ON global.add_vars_table_l3_name USING btree (hierarchy_code);
CREATE UNIQUE INDEX add_vars_table_l3_name_hierarchy_code_fy_fw_1501_idx ON global.add_vars_table_l3_name USING btree (hierarchy_code, fiscal_year, fiscal_week);