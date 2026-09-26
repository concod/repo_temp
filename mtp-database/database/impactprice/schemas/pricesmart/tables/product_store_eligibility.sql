--liquibase formatted sql
--changeset harshith.mandli@impactanalytics.co:product_store_eligibility stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initital changeset for product_store_eligibility

CREATE TABLE pricesmart.product_store_eligibility (
    l0_cid int4 NULL,
    store_id int4 NULL
);