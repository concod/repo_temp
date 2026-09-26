--liquibase formatted sql
--changeset kumaran.k@impactanalytics.co:store_attributes_filter_v3  stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for store_attributes_filter_v3

DROP TABLE IF EXISTS "global".store_attributes_filter CASCADE;
CREATE TABLE "global".store_attributes_filter (
	store_code varchar NOT NULL,
	store_name varchar NOT NULL,
	store_description text NULL,
	active bool NOT NULL,
	special_classification varchar NULL,
	created_at timestamptz NULL,
	updated_at timestamptz NULL,
	created_by int4 NULL,
	updated_by int4 NULL,
	dc_code int4 NULL,
	fc_code int4 NULL,
	is_deleted bool NULL,
	country varchar NULL,
	city varchar NULL,
	address varchar NULL,
	address_2 varchar NULL,
	open_date date NULL,
	closed bool NULL,
	compqualify_date date NULL,
	corporate int4 NULL,
	corporate_description varchar NULL,
	county varchar NULL,
	dma varchar NULL,
	state varchar NULL,
	store_name_heading varchar NULL,
	loyalty_scheme varchar NULL,
	business varchar NULL,
	channel varchar NULL,
	CONSTRAINT store_attributes_filter_pk PRIMARY KEY (store_code),
	CONSTRAINT store_attributes_filter_fk FOREIGN KEY (store_code) REFERENCES "global".store_master(store_code) ON DELETE CASCADE
);


--changeset liquibase:kumaran.k@impactanalytics.co:store_attributes_filter_v4 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for kumaran.k@impactanalytics.co:store_attributes_filter_v4
ALTER TABLE "global".store_attributes_filter
ALTER COLUMN special_classification SET DEFAULT 'NA';

UPDATE "global".store_attributes_filter
SET special_classification = 'NA'
WHERE special_classification IS NULL;

--changeset siddharth.bajpai@impactanalytics.co:store_attributes_filter_alters stripComments:false splitStatements:false context:Release_1_0 ignore:false labels:store_attributes_filter
--comment: ALTER statements for global.store_attributes_filter

ALTER TABLE global.store_attributes_filter ADD COLUMN IF NOT EXISTS channel_desc varchar NULL;
ALTER TABLE global.store_attributes_filter ADD COLUMN IF NOT EXISTS channel_group varchar NULL;
ALTER TABLE global.store_attributes_filter ADD COLUMN IF NOT EXISTS city_name varchar NULL;
ALTER TABLE global.store_attributes_filter ADD COLUMN IF NOT EXISTS climate varchar NULL;
ALTER TABLE global.store_attributes_filter ADD COLUMN IF NOT EXISTS close_date date NULL;
ALTER TABLE global.store_attributes_filter ADD COLUMN IF NOT EXISTS country_name varchar NULL;
ALTER TABLE global.store_attributes_filter ADD COLUMN IF NOT EXISTS dc_flag bool NULL;
ALTER TABLE global.store_attributes_filter ADD COLUMN IF NOT EXISTS dc_name varchar NULL;
ALTER TABLE global.store_attributes_filter ADD COLUMN IF NOT EXISTS district varchar NULL;
ALTER TABLE global.store_attributes_filter ADD COLUMN IF NOT EXISTS latitude int4 NULL;
ALTER TABLE global.store_attributes_filter ADD COLUMN IF NOT EXISTS longitude int4 NULL;
ALTER TABLE global.store_attributes_filter ADD COLUMN IF NOT EXISTS s0_id varchar NULL;
ALTER TABLE global.store_attributes_filter ADD COLUMN IF NOT EXISTS s0_id_name varchar NULL;
ALTER TABLE global.store_attributes_filter ADD COLUMN IF NOT EXISTS s0_name varchar NULL;
ALTER TABLE global.store_attributes_filter ADD COLUMN IF NOT EXISTS s1_id varchar NULL;
ALTER TABLE global.store_attributes_filter ADD COLUMN IF NOT EXISTS s1_id_name varchar NULL;
ALTER TABLE global.store_attributes_filter ADD COLUMN IF NOT EXISTS s1_name varchar NULL;
ALTER TABLE global.store_attributes_filter ADD COLUMN IF NOT EXISTS s2_id varchar NULL;
ALTER TABLE global.store_attributes_filter ADD COLUMN IF NOT EXISTS s2_id_name varchar NULL;
ALTER TABLE global.store_attributes_filter ADD COLUMN IF NOT EXISTS s2_name varchar NULL;
ALTER TABLE global.store_attributes_filter ADD COLUMN IF NOT EXISTS s3_id varchar NULL;
ALTER TABLE global.store_attributes_filter ADD COLUMN IF NOT EXISTS s3_id_name varchar NULL;
ALTER TABLE global.store_attributes_filter ADD COLUMN IF NOT EXISTS s3_name varchar NULL;
ALTER TABLE global.store_attributes_filter ADD COLUMN IF NOT EXISTS s4_id varchar NULL;
ALTER TABLE global.store_attributes_filter ADD COLUMN IF NOT EXISTS s4_id_name varchar NULL;
ALTER TABLE global.store_attributes_filter ADD COLUMN IF NOT EXISTS s4_name varchar NULL;
ALTER TABLE global.store_attributes_filter ADD COLUMN IF NOT EXISTS state_name varchar NULL;
ALTER TABLE global.store_attributes_filter ADD COLUMN IF NOT EXISTS store_code_name varchar NULL;
ALTER TABLE global.store_attributes_filter ADD COLUMN IF NOT EXISTS store_selling_size varchar NULL;
ALTER TABLE global.store_attributes_filter ADD COLUMN IF NOT EXISTS store_size varchar NULL;
ALTER TABLE global.store_attributes_filter ADD COLUMN IF NOT EXISTS store_tier varchar NULL;
ALTER TABLE global.store_attributes_filter ADD COLUMN IF NOT EXISTS store_type varchar NULL;
ALTER TABLE global.store_attributes_filter ADD COLUMN IF NOT EXISTS zipcode varchar NULL;
ALTER TABLE global.store_attributes_filter DROP COLUMN IF EXISTS address;
ALTER TABLE global.store_attributes_filter DROP COLUMN IF EXISTS address_2;
ALTER TABLE global.store_attributes_filter DROP COLUMN IF EXISTS business;
ALTER TABLE global.store_attributes_filter DROP COLUMN IF EXISTS city;
ALTER TABLE global.store_attributes_filter DROP COLUMN IF EXISTS closed;
ALTER TABLE global.store_attributes_filter DROP COLUMN IF EXISTS compqualify_date;
ALTER TABLE global.store_attributes_filter DROP COLUMN IF EXISTS corporate;
ALTER TABLE global.store_attributes_filter DROP COLUMN IF EXISTS corporate_description;
ALTER TABLE global.store_attributes_filter DROP COLUMN IF EXISTS country;
ALTER TABLE global.store_attributes_filter DROP COLUMN IF EXISTS county;
ALTER TABLE global.store_attributes_filter DROP COLUMN IF EXISTS dma;
ALTER TABLE global.store_attributes_filter DROP COLUMN IF EXISTS loyalty_scheme;
ALTER TABLE global.store_attributes_filter DROP COLUMN IF EXISTS state;
ALTER TABLE global.store_attributes_filter DROP COLUMN IF EXISTS store_name_heading;
ALTER TABLE global.store_attributes_filter ALTER COLUMN store_description TYPE varchar;
ALTER TABLE global.store_attributes_filter ALTER COLUMN store_name DROP NOT NULL;
ALTER TABLE global.store_attributes_filter ALTER COLUMN active DROP NOT NULL;

--changeset siddharth.bajpai@impactanalytics.co:store_attributes_filter_indexes_20251216 stripComments:false splitStatements:false context:Release_1_0 ignore:false labels:store_attributes_filter
--comment: Add indexes to match dev DB DDL

CREATE INDEX IF NOT EXISTS store_attributes_filter_active_idx ON global.store_attributes_filter USING btree (active) WHERE (active AND (NOT is_deleted));
CREATE INDEX IF NOT EXISTS store_attributes_filter_channel_idx ON global.store_attributes_filter USING btree (channel);
CREATE INDEX IF NOT EXISTS store_attributes_filter_s0_name_idx ON global.store_attributes_filter USING btree (s0_name);
CREATE INDEX IF NOT EXISTS store_attributes_filter_store_code_idx ON global.store_attributes_filter USING btree (store_code);
