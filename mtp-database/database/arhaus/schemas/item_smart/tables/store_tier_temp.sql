--liquibase formatted sql
--changeset abhimanyu.j@impactanalytics.co:ItemFact stripComments:false splitStatements:false context:Release_1_0 labels:itemsmart_initial_commit
--comment: initial changeset for store_tier_temp table

CREATE TABLE item_smart.store_tier_temp (
	end_date varchar(50) NULL,
	store_code int4 NULL,
	start_date varchar(50) NULL,
	store_tier varchar(50) NULL
);