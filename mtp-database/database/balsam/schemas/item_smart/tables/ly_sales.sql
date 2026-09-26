--liquibase formatted sql
--changeset hari.krishna@impactanalytics.co:ly_sales stripComments:false splitStatements:false context:Release_1_0 labels:itemsmart_initial_commit
--comment: initial changeset for ly_sales
CREATE TABLE item_smart.ly_sales (
	hierarchy_code int4 NULL,
	ly_sales int4 NULL
);