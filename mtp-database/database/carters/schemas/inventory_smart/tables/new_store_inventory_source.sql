--liquibase formatted sql
--changeset shrinidhi.choragi@impactanalytics.co:new_store_inventory_source stripComments:false splitStatements:false context: https://impactanalytics.atlassian.net/browse/CI-40 labels:schema 
--comment: initial changeset for new_store_inventory_source
CREATE TABLE inventory_smart.new_store_inventory_source (
	article varchar NOT NULL,
	dc_code int4 NOT NULL,
	pack_type_id varchar NOT NULL,
	pack_type varchar NOT NULL,
	oh_pack_qty int4 NULL,
	channel varchar NOT NULL
);
ALTER TABLE inventory_smart.new_store_inventory_source ADD CONSTRAINT new_store_inventory_source_unique UNIQUE (article,dc_code,pack_type_id,channel);
