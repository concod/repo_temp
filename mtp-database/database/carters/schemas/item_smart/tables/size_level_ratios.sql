--liquibase formatted sql
--changeset jaya.khandelwal@impactanalytics.co:size_level_ratios stripComments:false splitStatements:false context:Release_1_0 labels:itemsmart_initial_commit
--comment: initial changeset for size_level_ratios
CREATE TABLE item_smart.size_level_ratios (
    article TEXT NOT NULL,
    l0_name TEXT NOT NULL,
    channel TEXT NOT NULL,
    fiscal_year_week INT4 NOT NULL,
    size TEXT NOT NULL,
    size_ratio_calc NUMERIC NOT NULL,
    PRIMARY KEY (article, l0_name, channel, fiscal_year_week, size)
);
