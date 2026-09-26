--liquibase formatted sql
--changeset abhishek.singh@impactanalytics.co:offer_distributor_channel_enum  stripComments:false splitStatements:false context:Release_1_0 labels: liquibase_project_start
--comment: initial changeset for price_promo.offer_distributor_channel_enum


CREATE TYPE price_promo.offer_distributor_channel_enum AS ENUM (
    'app only promotions',
    'general availability'
);



--changeset abhishek.singh@impactanalytics.co:offer_distributor_channel_enum_1  stripComments:false splitStatements:false context:Release_1_0 labels: liquibase_project_start
--comment: initial changeset for price_promo.offer_distributor_channel_enum
DROP TYPE IF EXISTS price_promo.offer_distributor_channel_enum;
CREATE TYPE price_promo.offer_distributor_channel_enum AS ENUM (
    'General Availability',
    'App Only Promotions'
);