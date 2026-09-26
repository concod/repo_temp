--liquibase formatted sql
--changeset tarun.tyagi@impactanalytics.co:dc_transfer_recommendation_dc_dc_mapping stripComments:false splitStatements:false context:VS_intl_inv_smart labels:MTP-80390
--comment: initial changeset for dc_transfer_recommendation_dc_dc_mapping


CREATE TABLE IF NOT EXISTS inventory_smart.dc_transfer_recommendation_dc_dc_mapping (
	article varchar NOT NULL,
	source_code varchar NOT NULL,
	destination_code varchar NOT NULL,
	PRIMARY KEY (article, source_code, destination_code)
);
