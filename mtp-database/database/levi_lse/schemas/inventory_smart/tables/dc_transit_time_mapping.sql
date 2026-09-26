--liquibase formatted sql
--changeset aniruddh.singh@impactanalytics.co:dc_transit_time_mapping stripComments:false splitStatements:false context:Release_1_0 labels:briscoes_dc_transit_time_mapping
--comment: initial changeset for dc_transit_time_mapping
CREATE TABLE if NOT exists inventory_smart.dc_transit_time_mapping (
	mapping_code int4 NOT NULL,
	transit_time float4 NOT NULL
);
--changeset pradeep.nayak@impactanalytics.co:dc_transit_time_mapping stripComments:false splitStatements:false context:Release_1_1 labels:addedpriority
--comment: added changeset for priority col and index
ALTER TABLE inventory_smart.dc_transit_time_mapping ADD COLUMN IF NOT EXISTS priority int4 DEFAULT 1;
CREATE UNIQUE INDEX IF NOT EXISTS dc_transit_time_mapping_mapping_code_idx ON inventory_smart.dc_transit_time_mapping USING btree (mapping_code);