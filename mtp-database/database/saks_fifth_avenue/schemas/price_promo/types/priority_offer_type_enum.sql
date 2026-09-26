--liquibase formatted sql
--changeset abhishek.singh@impactanalytics.co:priority_offer_type_enum stripComments:false splitStatements:false context:Release_1_0 labels: liquibase_project_start
--comment: initial changeset for price_promo.priority_offer_type_enum


CREATE TYPE price_promo.priority_offer_type_enum AS ENUM (
    'simple promo/pos',
    'o5 loyalty: early access',
    'o5 loyalty: welcome',
    'stackable on all offers including order level',
    'stackable only with p420 and p460',
    'gwp stackable with other gwp',
    'first day discount',
    'o5 loyalty special event',
    'o5 loyalty rewards',
    'free gc shipping dummy',
    'free gc shipping',
    'other receipt messages (single store or associates)',
    'all store receipt message (survey)'
);