--liquibase formatted sql
--changeset swapnil.bhange:new_store_attributes stripComments:false splitStatements:false context:new_store_attributes
--comment: initial changeset for new_store_attributes
CREATE TABLE "global".new_store_attributes (
	store_code varchar NOT NULL,
	opening_date date NULL,
	sister_store_mapping_date date NULL,
	store_group_mapping_date date NULL,
	store_groups _varchar DEFAULT ARRAY[]::character varying[] NULL,
	CONSTRAINT new_store_attributes_pk PRIMARY KEY (store_code)
);

--changeset swapnil.bhange-1:new_store_attributes_v2 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for new_store_attributes_v2
CREATE INDEX new_store_attributes_store_code_idx ON global.new_store_attributes USING btree (store_code);
ALTER TABLE "global".new_store_attributes ADD COLUMN IF NOT EXISTS reservation_start_date date null;
ALTER TABLE "global".new_store_attributes ADD COLUMN IF NOT EXISTS effective_date date null;
ALTER TABLE "global".new_store_attributes ADD COLUMN IF NOT EXISTS temp_store_code varchar null;
ALTER TABLE "global".new_store_attributes ADD COLUMN IF NOT EXISTS temp_opening_date date null;
ALTER TABLE "global".new_store_attributes ADD COLUMN IF NOT EXISTS temp_legacy_store_mapping_date date null;
ALTER TABLE "global".new_store_attributes ADD COLUMN IF NOT EXISTS temp_closing_date date null;
ALTER TABLE "global".new_store_attributes ADD COLUMN IF NOT EXISTS temp_effective_date date null;
ALTER TABLE "global".new_store_attributes ADD COLUMN IF NOT EXISTS legacy_store_code varchar null;
ALTER TABLE "global".new_store_attributes ADD COLUMN IF NOT EXISTS legacy_closing_date date null;
ALTER TABLE "global".new_store_attributes ADD COLUMN IF NOT EXISTS remodel_flag bool null;
ALTER TABLE "global".new_store_attributes ADD COLUMN IF NOT EXISTS status int4 NULL;
ALTER TABLE "global".new_store_attributes ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT false;
