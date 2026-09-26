--liquibase formatted sql
--changeset tarun.tyagi@impactanalytics.co:dc_transfer_recommendation_promised_allocations stripComments:false splitStatements:false context:VS_intl_inv_smart labels:MTP-80390
--comment: initial changeset for dc_transfer_recommendation_promised_allocations


CREATE TABLE IF NOT EXISTS inventory_smart.dc_transfer_recommendation_promised_allocations (
	article varchar NOT NULL,
	size varchar NOT NULL,
	store varchar NOT NULL,
	promised_quantity float4 null,
	allocation_codes varchar[] NULL,
	PRIMARY KEY (article, size, store)
);
