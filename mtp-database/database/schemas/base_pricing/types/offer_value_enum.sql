--liquibase formatted sql
--changeset abhishek.singh@impactanalytics.co:offer_value_enum stripComments:false splitStatements:false context:Release_1_0 labels: liquibase_project_start
--comment: initial changeset for base_pricing.offer_value_enum


CREATE TYPE base_pricing.offer_value_enum AS ENUM (
    'B2G1', 'B3G1', 'B1G2', 'B1G1', 'B2G2', 
    'BOGO 25%', 'BOGO 50%', 'BOGO 40%', 'BOGO 30%'
);