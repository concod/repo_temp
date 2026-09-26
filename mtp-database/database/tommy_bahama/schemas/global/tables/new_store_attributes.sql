--liquibase formatted sql
--changeset rishabh.kumar@impactanalytics.co:new_store_attributes_v1 stripComments:false splitStatements:false context:new_store_attributes labels:new_store_attributes
--comment: new_store_attributes
CREATE TABLE IF NOT EXISTS "global".new_store_attributes (
	store_code varchar NOT NULL,
	opening_date date NULL,
	sister_store_mapping_date date NULL,
	store_group_mapping_date date NULL,
	store_groups _varchar DEFAULT ARRAY[]::character varying[] NULL,
	CONSTRAINT pk PRIMARY KEY (store_code)
);
CREATE INDEX IF NOT EXISTS new_store_attributes_indx1 ON global.new_store_attributes USING btree (store_code);