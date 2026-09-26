--liquibase formatted sql
--changeset abhimanyu.j@impactanalytics.co:ItemFact stripComments:false splitStatements:false context:Release_1_0 labels:itemsmart_initial_commit
--comment: initial changeset for future_air_master_temp table

CREATE TABLE item_smart.future_air_master_temp (
	product_code varchar(50) NULL,
	end_date varchar(50) NULL,
	suggested_retail_price float4 NULL,
	start_date varchar(50) NULL
);