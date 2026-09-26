--liquibase formatted sql
--changeset liquibase:req_tracker stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for req_tracker
CREATE TABLE ada.req_tracker (
    date date,
    store_code text,
    product_code text
);
