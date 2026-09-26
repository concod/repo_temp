--liquibase formatted sql
--changeset shameel.zeshan@impactanalytics.co:dc_pack_reserve_quantity_derived_table stripComments:false splitStatements:false context: https://impactanalytics.atlassian.net/browse/CI-40 labels:schema 
--comment: initial changeset for dc_pack_reserve_quantity_derived_table

CREATE TABLE inventory_smart.dc_pack_reserve_quantity_derived_table (
	article varchar NOT NULL,
	date date NOT NULL,
	reserve_quantity int4 NULL
);
ALTER TABLE inventory_smart.dc_pack_reserve_quantity_derived_table ADD CONSTRAINT dc_pack_reserve_quantity_derived_table_pk PRIMARY KEY (article, date);