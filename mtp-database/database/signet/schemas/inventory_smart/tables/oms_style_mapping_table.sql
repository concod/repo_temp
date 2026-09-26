--liquibase formatted sql
--changeset aman.lakkoju:oms_style_mapping_table stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for oms_style_mapping_table

CREATE TABLE IF NOT EXISTS inventory_smart.oms_style_mapping_table (
    new_article text NULL,
    new_product_code text NOT NULL,
    old_article text NULL,
    old_product_code text NOT NULL,
    old_l0_name text NULL,
    old_l1_name text NULL,
    old_l2_name text NULL,
    old_l3_name text NULL,
    old_cvsc text NULL,
    old_product_description text NULL,
    old_size text NULL,
    old_size_name text NULL,
    mapping_type text NULL,
    priority int8 NULL,
    updated_at text NULL,
    updated_by text NULL,
    has_store_exception bool NULL,
    start_date text NULL,
    end_date text NULL,
    eff_lead_time int8 NULL,
    CONSTRAINT pk_oms_style_mapping_table PRIMARY KEY (new_product_code, old_product_code)
);