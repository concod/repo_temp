--liquibase formatted sql
--changeset aniruddh.singh@impactanalytics.co:dc_transit_time_mapping stripComments:false splitStatements:false context:Release_1_0 labels:briscoes_dc_transit_time_mapping
--comment: initial changeset for dc_transit_time_mapping
CREATE TABLE if NOT exists inventory_smart.dc_transit_time_mapping (
	mapping_code int4 NOT NULL,
	transit_time float4 NOT NULL
);
ALTER TABLE inventory_smart.dc_transit_time_mapping ADD COLUMN IF NOT EXISTS priority int4 DEFAULT 1;