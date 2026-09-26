--liquibase formatted sql
--changeset ayush.keshari@impactanalytics.co:custom_filters_scope stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for custom_filters_scope

CREATE TYPE price_promo.custom_filters_scope AS ENUM (
    'personal',
    'global'
); 