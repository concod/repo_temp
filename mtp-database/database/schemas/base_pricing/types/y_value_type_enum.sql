--liquibase formatted sql
--changeset abhishek.singh@impactanalytics.co:y_value_type_enum stripComments:false splitStatements:false context:Release_1_0 labels: liquibase_project_start
--comment: initial changeset for base_pricing.y_value_type_enum


CREATE TYPE base_pricing.y_value_type_enum AS ENUM (
    'percent_off', 
    'dollar_off',
    'at_dollar'
);