--liquibase formatted sql
--changeset raj.mohan@impactanalytics.co:product_profile_user_mapping stripComments:false splitStatements:false context:MTP-58075 labels:MTP-58075
--comment: MTP-58075-user-mapping-table-for-user-defined-pp
CREATE TABLE IF NOT EXISTS inventory_smart.product_profile_user_mapping (
    pp_code int4 NOT NULL,
    l0_name varchar NULL,
    size_level_proportion float4 NOT NULL,
    overall_proportion float4 NOT NULL,
    product_unique_code varchar NOT NULL,
    store_code varchar NOT NULL,
    CONSTRAINT pp_product_store_un UNIQUE (pp_code, product_unique_code, store_code),
    CONSTRAINT product_profile_mapping_fk FOREIGN KEY (pp_code) REFERENCES inventory_smart.product_profile_master(pp_code) ON DELETE CASCADE
);

