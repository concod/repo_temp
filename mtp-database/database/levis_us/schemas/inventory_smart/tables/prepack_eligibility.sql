-- liquibase formatted sql
-- changeset himansh.bhardwaj@impactanalytics.co:prepack_eligibility stripComments:false splitStatements:false context: AA labels:schema 
-- comment: initial changeset for prepack_eligibility
CREATE TABLE inventory_smart.prepack_eligibility (
    l0_name varchar NOT NULL,
    l1_name varchar NOT NULL,
    article varchar NOT NULL,
    on_floor_date DATE NULL,
    store_code varchar NOT NULL,
    eligible_packs varchar NULL,
    allocation_type varchar NULL,
    CONSTRAINT prepack_eligibility_unique UNIQUE (article, store_code, eligible_packs)
);