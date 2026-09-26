--liquibase formatted sql
--changeset abhishek.singh@impactanalytics.co:product_selection_type_enum stripComments:false splitStatements:false context:Release_1_0 labels: liquibase_project_start
--comment: initial changeset for base_pricing.product_selection_type_enum


CREATE TYPE base_pricing.product_selection_type_enum AS ENUM (
    'sitewide', 
    'product_group', 
    'specific_products', 
    'whole_category'
);