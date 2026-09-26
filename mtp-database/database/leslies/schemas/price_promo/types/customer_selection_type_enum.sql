--liquibase formatted sql
--changeset shrrayan.sheel@impactanalytics.co:customer_selection_type_enum  stripComments:false splitStatements:false context:Release_1_0 labels: liquibase_project_start
--comment: initial changeset for price_promo.customer_selection_type_enum


CREATE TYPE price_promo.customer_selection_type_enum AS ENUM (
    'customer_segment'
);