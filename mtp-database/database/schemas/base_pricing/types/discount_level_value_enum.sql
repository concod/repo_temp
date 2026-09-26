--liquibase formatted sql
--changeset abhishek.singh@impactanalytics.co:discount_level_value_enum stripComments:false splitStatements:false context:Release_1_0 labels: liquibase_project_start
--comment: initial changeset for base_pricing.discount_level_value_enum


CREATE TYPE base_pricing.discount_level_value_enum AS ENUM (
    'Overall', 
    'Division',
    'Group', 
    'Department', 
    'Class',
    'Sub-class', 
    'SKU', 
    'Product-Group', 
    'Brand' 
);


--changeset abhishek.singh@impactanalytics.co:discount_level_value_enum_1 stripComments:false splitStatements:false context:Release_1_0 labels: liquibase_project_start
--comment: initial changeset for base_pricing.discount_level_value_enum
DROP TYPE IF EXISTS base_pricing.discount_level_value_enum;
CREATE TYPE base_pricing.discount_level_value_enum AS ENUM (
    'Overall', 
    'Division',
    'Group', 
    'Department', 
    'Class',
    'Sub-class', 
    'SKU', 
    'Product-Group', 
    'Brand' 
);
