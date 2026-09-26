--liquibase formatted sql
--changeset pavankumar.reddy@impactanalytics.co:store_attributes_filter  stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for store_attributes_filter

CREATE TABLE "global".store_attributes_filter (
	store_code varchar NOT NULL,
	region_id varchar NULL,
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
	channel_desc varchar NULL,
	s0_id varchar NULL,
	s0_name varchar NULL,
	s1_id varchar NULL,
	s1_name varchar NULL,
	store_name_updated varchar NULL,
	created_at timestamptz NULL,
	updated_at timestamptz NULL,
	created_by int4 NULL,
	updated_by int4 NULL,
	store_name varchar NULL,
	dc_code int4 NULL,
	store_description varchar NULL,
	fc_code int4 NULL,
	region_name varchar NULL,
	store_name_store_id varchar NULL,
	s2_id varchar NULL,
	s2_name varchar NULL,
	s3_id varchar NULL,
	s3_name varchar NULL,
	CONSTRAINT store_attributes_filter_pk PRIMARY KEY (store_code)
);
CREATE INDEX saf_active_common_idx ON global.store_attributes_filter USING btree (channel, special_classification) WHERE ((active = true) AND (is_deleted = false));
CREATE INDEX saf_common_idx ON global.store_attributes_filter USING btree (channel, special_classification);