--liquibase formatted sql
--changeset abhishek.singh@impactanalytics.co:store_selection_type_enum  stripComments:false splitStatements:false context:Release_1_0 labels: liquibase_project_start
--comment: initial changeset for price_promo.store_selection_type_enum


CREATE TYPE price_promo.store_selection_type_enum AS ENUM (
    'all_stores', 
    'bnm_stores', 
    'ecom_stores', 
    'specific_stores'
);