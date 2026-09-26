--liquibase formatted sql
--changeset abhimanyu.j@impactanalytics.co:ItemFact stripComments:false splitStatements:false context:Release_1_0 labels:itemsmart_initial_commit
--comment: initial changeset for assortment_tier_temp table

CREATE TABLE item_smart.assortment_tier_temp (
	end_date varchar(50) NULL,
	product_code varchar(50) NULL,
	store_tier varchar(50) NULL,
	start_date varchar(50) NULL
);