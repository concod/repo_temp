--liquibase formatted sql
--changeset abhishek.singh@impactanalytics.co:store_selection_sub_type_enum stripComments:false splitStatements:false context:Release_1_0 labels: liquibase_project_start
--comment: initial changeset for base_pricing.store_selection_sub_type_enum


CREATE TYPE base_pricing.store_selection_sub_type_enum AS ENUM (
    'hierarchy', 
    'upload', 
    'copy_paste', 
    'store_group'
);