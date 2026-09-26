--liquibase formatted sql
--changeset abhishek.singh@impactanalytics.co:offer_type_enum stripComments:false splitStatements:false context:Release_1_0 labels: liquibase_project_start
--comment: initial changeset for price_promo.offer_type_enum


CREATE TYPE price_promo.offer_type_enum AS ENUM (
    'bxgy', 
    'bxgy_percent_off'
);