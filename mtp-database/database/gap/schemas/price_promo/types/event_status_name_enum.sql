--liquibase formatted sql
--changeset abhishek.singh@impactanalytics.co:event_status_name_enum  stripComments:false splitStatements:false context:Release_1_0 labels: liquibase_project_start
--comment: initial changeset for price_promo.event_status_name_enum


CREATE TYPE price_promo.event_status_name_enum AS ENUM (
    'Draft',
    'Upcoming',
    'Ongoing',
    'Completed'
);


