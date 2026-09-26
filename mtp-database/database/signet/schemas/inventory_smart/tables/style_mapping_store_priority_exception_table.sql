--liquibase formatted sql
--changeset bikrant.gupta:style_mapping_store_priority_exception_table stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for style_mapping_store_priority_exception_table
CREATE TABLE inventory_smart.style_mapping_store_priority_exception_table (
    new_article character varying(50) NULL,
    new_product_code character varying(50) NULL,
    old_article character varying(50) NULL,
    old_product_code character varying(50) NULL,
    store character varying(50) NULL,
    store_priority integer NULL,
    start_date date NULL,
    end_date date NULL,
    updated_at timestamp without time zone NULL,
    updated_by character varying(50) NULL
);