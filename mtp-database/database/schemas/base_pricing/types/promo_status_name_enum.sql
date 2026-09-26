--liquibase formatted sql
--changeset abhishek.singh@impactanalytics.co:promo_status_name_enum stripComments:false splitStatements:false context:Release_1_0 labels: liquibase_project_start
--comment: initial changeset for base_pricing.promo_status_name_enum


CREATE TYPE base_pricing.promo_status_name_enum AS ENUM (
    'Placeholder',
    'Draft/Copied',
    'To Finalize',
    'Finalized',
    'Archived',
    'Execution Approved'
);