--liquibase formatted sql
--changeset liquibase:combine_date stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for combine_date
CREATE TABLE ada.combine_date (
    date date,
    store_code text,
    product_code text
);
