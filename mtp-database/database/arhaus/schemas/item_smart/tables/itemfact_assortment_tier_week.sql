--liquibase formatted sql
--changeset abhimanyu.j@impactanalytics.co:ItemFact stripComments:false splitStatements:false context:Release_1_0 labels:itemsmart_initial_commit
--comment: initial changeset for itemfact_assortment_tier_week table

CREATE TABLE item_smart.itemfact_assortment_tier_week (
	assortment_tier text NULL,
	current_week int8 NULL,
	store_count int8 NULL
);