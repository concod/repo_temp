--liquibase formatted sql
--changeset abhishek.singh@impactanalytics.co:offer_distributor_channel_enum stripComments:false splitStatements:false context:Release_1_0 labels: liquibase_project_start
--comment: initial changeset for base_pricing.offer_distributor_channel_enum


CREATE TYPE base_pricing.offer_distributor_channel_enum AS ENUM (
    'app only promotions',
    'general availability'
);