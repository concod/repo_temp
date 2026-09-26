--liquibase formatted sql
--changeset laraib.ahmad:product_attributes_filter stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for product_attributes_filter
CREATE TABLE IF NOT EXISTS "global".store_attributes_filter (
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
	s0_name varchar NOT NULL,
	s1_name varchar NOT NULL,
	channel varchar NULL,
	channel_group varchar NULL,
	city varchar NULL,
	climate varchar NULL,
	close_date date NULL,
	country varchar NULL,
	dc_name varchar NULL,
	district varchar NULL,
	latitude varchar NULL,
	like_store_id varchar NULL,
	longitude varchar NULL,
	open_date date NULL,
	region varchar NULL,
	s0_id varchar NOT NULL,
	s1_id varchar NOT NULL,
	s2_id varchar NULL,
	s2_name varchar NULL,
	s3_name varchar NULL,
	s4_name varchar NULL,
	state varchar NULL,
	store_attribute_1 varchar NULL,
	store_attribute_10 varchar NULL,
	store_attribute_11 varchar NULL,
	store_attribute_12 varchar NULL,
	store_attribute_13 varchar NULL,
	store_attribute_14 varchar NULL,
	store_attribute_15 varchar NULL,
	store_attribute_2 varchar NULL,
	store_attribute_3 varchar NULL,
	store_attribute_4 varchar NULL,
	store_attribute_5 varchar NULL,
	store_attribute_6 varchar NULL,
	store_attribute_7 varchar NULL,
	store_attribute_8 varchar NULL,
	store_attribute_9 varchar NULL,
	store_size varchar NULL,
	store_status varchar NULL,
	store_tier varchar NULL,
	zipcode varchar NULL,
	CONSTRAINT store_attributes_filter_pk PRIMARY KEY (store_code),
	CONSTRAINT store_attributes_filter_fk FOREIGN KEY (store_code) REFERENCES "global".store_master(store_code) ON DELETE CASCADE
);
--changeset laraib.ahamad:syncing up test postgres and bitbucket stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: adding inner_pack_units
ALTER TABLE "global".product_attributes_filter ADD COLUMN IF NOT EXISTS dc_flag bool NULL;

--changeset laraib.ahamad_1:syncing up test postgres and bitbucket_1 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: adding inner_pack_units_1
ALTER TABLE "global".store_attributes_filter ADD COLUMN IF NOT EXISTS dc_flag bool NULL;
