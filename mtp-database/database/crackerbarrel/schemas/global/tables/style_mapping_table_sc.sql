--liquibase formatted sql
--changeset liquibase:style_mapping_table_sc stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for style_mapping_table_sc


CREATE TABLE global.style_mapping_table_sc(
    new_article               TEXT  NULL,
    new_product_code          TEXT  NULL,
    old_article               TEXT NULL,
    old_product_code          TEXT NULL,
    mapping_type              TEXT NULL,
    priority                  INTEGER NULL,
    effective_date            DATE NULL,
    updated_at                timestamptz NULL,
    updated_by                TEXT NULL,
    old_l0_name               TEXT NULL,
    old_l1_name               TEXT NULL,
    old_l2_name               TEXT NULL,
    old_l3_name               TEXT NULL,
    old_l4_name               TEXT NULL,
    old_l5_name               TEXT NULL,
    old_product_description   TEXT NULL,
    old_size                  TEXT NULL,
    old_size_name             TEXT NULL
);

--changeset kamalesh.k:style_mapping_table_sc stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: adding primary key to style_mapping_table_sc
ALTER TABLE global.style_mapping_table_sc
    ALter COLUMN new_product_code SET NOT NULL,
    ALter COLUMN old_product_code SET NOT NULL;
    
ALTER TABLE global.style_mapping_table_sc
    ADD CONSTRAINT style_mapping_table_sc_pkey PRIMARY KEY (new_product_code, old_product_code);