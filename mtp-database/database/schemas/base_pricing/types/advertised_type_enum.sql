--liquibase formatted sql
--changeset abhishek.singh@impactanalytics.co:advertised_type_enum_1 stripComments:false splitStatements:false context:Release_1_0 labels: liquibase_project_start
--comment: initial changeset for base_pricing.advertised_type_enum


CREATE TYPE base_pricing.advertised_type_enum AS ENUM (
    'advertised', 'unadvertised'
);
