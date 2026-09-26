--liquibase formatted sql
--changeset liquibase:store_attributes_filter_v3 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for store_attributes_filter_v3

-- "global".store_attributes_filter definition

-- Drop table

-- DROP TABLE "global".store_attributes_filter;


CREATE TABLE IF NOT EXISTS "global".store_attributes_filter (
	store_code varchar NOT NULL,
	region varchar NULL,
	country varchar NULL,
	district varchar NULL,
	age int4 NULL,
	channel varchar NULL,
	classification varchar NULL,
	close_date date NULL,
	dc_name varchar NULL,
	fc_name varchar NULL,
	location_indicator varchar NULL,
	location_type varchar NULL,
	"name" varchar NULL,
	open_date date NULL,
	zipcode varchar NULL,
	active bool NOT NULL,
	special_classification varchar NULL,
	is_deleted bool NULL,
	CONSTRAINT store_attributes_filter_pk PRIMARY KEY (store_code)
);
CREATE INDEX IF NOT EXISTS saf_active_common_idx ON global.store_attributes_filter USING btree (channel, special_classification) WHERE ((active = true) AND (is_deleted = false));
CREATE INDEX IF NOT EXISTS saf_common_idx ON global.store_attributes_filter USING btree (channel, special_classification);


--changeset liquibase:store_attributes_filter_v5 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for store_attributes_filter_v5

-- Add new columns
ALTER TABLE "global".store_attributes_filter
ADD COLUMN IF NOT EXISTS created_at timestamptz NULL,
ADD COLUMN IF NOT EXISTS updated_at timestamptz NULL,
ADD COLUMN IF NOT EXISTS created_by int4 NULL,
ADD COLUMN IF NOT EXISTS updated_by int4 NULL,
ADD COLUMN IF NOT EXISTS company_name varchar NULL,
ADD COLUMN IF NOT EXISTS city varchar NULL,
ADD COLUMN IF NOT EXISTS store_description text NULL,
ADD COLUMN IF NOT EXISTS s3_id varchar NULL,
ADD COLUMN IF NOT EXISTS location_num_store_name varchar NULL,
ADD COLUMN IF NOT EXISTS location_hierarchy_region_code varchar NULL,
ADD COLUMN IF NOT EXISTS geography varchar NULL,
ADD COLUMN IF NOT EXISTS dc_code int4 NULL,
ADD COLUMN IF NOT EXISTS loc_type_code int8 NULL,
ADD COLUMN IF NOT EXISTS state varchar NULL,
ADD COLUMN IF NOT EXISTS store_type varchar NULL,
ADD COLUMN IF NOT EXISTS like_store_id varchar NULL,
ADD COLUMN IF NOT EXISTS s4_name varchar NULL,
ADD COLUMN IF NOT EXISTS store_format_code varchar NULL,
ADD COLUMN IF NOT EXISTS store_name varchar NULL,
ADD COLUMN IF NOT EXISTS dc_flag bool NULL,
ADD COLUMN IF NOT EXISTS district_name varchar NULL,
ADD COLUMN IF NOT EXISTS s0_name varchar NULL,
ADD COLUMN IF NOT EXISTS s3_name varchar NULL,
ADD COLUMN IF NOT EXISTS ws_channel varchar NULL,
ADD COLUMN IF NOT EXISTS company_code varchar NULL,
ADD COLUMN IF NOT EXISTS s1_name varchar NULL,
ADD COLUMN IF NOT EXISTS location_attrib_squareft float8 NULL,
ADD COLUMN IF NOT EXISTS latitude float8 NULL,
ADD COLUMN IF NOT EXISTS fc_code int4 NULL,
ADD COLUMN IF NOT EXISTS longitude float8 NULL,
ADD COLUMN IF NOT EXISTS channel_code varchar NULL,
ADD COLUMN IF NOT EXISTS s2_name varchar NULL;


-- Add foreign key constraint to link with store_master
ALTER TABLE "global".store_attributes_filter
DROP CONSTRAINT IF EXISTS store_attributes_filter_fk;

ALTER TABLE "global".store_attributes_filter
ADD CONSTRAINT store_attributes_filter_fk
FOREIGN KEY (store_code)
REFERENCES "global".store_master(store_code)
ON DELETE CASCADE;