--liquibase formatted sql
--changeset abhishek.singh@impactanalytics.co:product_selection_type_enum  stripComments:false splitStatements:false context:Release_1_0 labels: liquibase_project_start
--comment: initial changeset for price_promo.product_selection_type_enum


CREATE TYPE price_promo.product_selection_type_enum AS ENUM (
    'sitewide', 
    'product_group', 
    'specific_products', 
    'whole_category'
);