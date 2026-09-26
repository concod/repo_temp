--liquibase formatted sql
--changeset abhimanyu.j@impactanalytics.co:w2d stripComments:false splitStatements:false context:Release_1_0 labels:itemsmart_initial_commit
--comment: initial changeset for w2d table

CREATE TABLE item_smart.w2d_itemsmart (
    dept VARCHAR,
    class VARCHAR,
    hierarchy_code INTEGER,
    channel VARCHAR,
    current_week INTEGER,
    delivered_week INTEGER,
    delivered_rates FLOAT
)
PARTITION BY LIST (dept);