--liquibase formatted sql
--changeset himanshu.bhardwaj:style_mapping_table_anamoly stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: added style_mapping_table_anamoly
CREATE TABLE IF NOT EXISTS inventory_smart.style_mapping_table_anamoly (
    new_article VARCHAR,
    new_product_code VARCHAR,
    old_article VARCHAR,
    old_product_code VARCHAR,
    old_l0_name VARCHAR,
    old_l1_name VARCHAR,
    old_l2_name VARCHAR,
    old_l3_name VARCHAR,
    old_cvsc VARCHAR,
    old_product_description TEXT,
    old_size VARCHAR,
    old_size_name VARCHAR,
    mapping_type VARCHAR,
    priority INTEGER,
    start_date DATE,
    end_date DATE,
    updated_at TIMESTAMP WITHOUT TIME ZONE,
    updated_by VARCHAR,
    has_store_exception BOOLEAN,
    inserted_at TIMESTAMP
);
