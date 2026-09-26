--liquibase formatted sql
--changeset abhishek.singh@impactanalytics.co:customer_type_enum stripComments:false splitStatements:false context:Release_1_0 labels: liquibase_project_start
--comment: initial changeset for base_pricing.customer_type_enum


CREATE TYPE base_pricing.customer_type_enum AS ENUM (
    'loyalty', 
    'all_customers'
);