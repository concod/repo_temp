--liquibase formatted sql
--changeset jyothika.chowdary@impactanalytics.co:multichannel_view stripComments:false splitStatements:false context:Release_1_0 labels:itemsmart_initial_commit
--comment: initial changeset for multichannel_view

CREATE TABLE IF NOT EXISTS item_smart.multichannel_view (
    id SERIAL PRIMARY KEY,
    kpi_group VARCHAR(100),
    kpi VARCHAR(100),
    application_label VARCHAR(100),
    view_omni CHAR(1),
    view_ecom CHAR(1),
    view_ecom_percent CHAR(1),
    view_wholesale CHAR(1),
    view_wholesale_percent CHAR(1),
    edit_omni CHAR(1),
    edit_ecom CHAR(1),
    edit_ecom_percent CHAR(1),
    edit_wholesale CHAR(1),
    edit_wholesale_percent CHAR(1),
    view_single_1 CHAR(1),
    edit_single_1 CHAR(1),
    view_single_2 CHAR(1),
    edit_single_2 CHAR(1)
);
