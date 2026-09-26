--liquibase formatted sql
--changeset harshita.kona@impactanalytics.co:table_views_scope stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for table_views_scope

CREATE TYPE price_promo.table_views_scope AS ENUM (
    'personal',
    'global'
);