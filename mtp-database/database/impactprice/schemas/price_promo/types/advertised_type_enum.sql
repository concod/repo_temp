--liquibase formatted sql
--changeset abhishek.singh@impactanalytics.co:advertised_type_enum_1  stripComments:false splitStatements:false context:Release_1_0 labels: liquibase_project_start
--comment: initial changeset for price_promo.advertised_type_enum


CREATE TYPE price_promo.advertised_type_enum AS ENUM (
    'advertised', 'unadvertised'
);
