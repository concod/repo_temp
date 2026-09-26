-- liquibase formatted sql
-- changeset abhishek.verma@impactanalytics.co:store_attributes_filter stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
-- comment: derived table for store_attributes_filter

CREATE TABLE "global".store_attributes_filter (
	store_code varchar NOT NULL,
	region varchar NULL,
	country varchar NULL,
	district varchar NULL,
	channel varchar NULL,
	dc_code int4 NULL,
	fc_code int4 NULL,
	location_type varchar NULL,
	zipcode int4 NULL,
	active bool NOT NULL,
	is_deleted bool DEFAULT false NULL,
	special_classification varchar NULL,
	state varchar NULL,
	climate varchar NULL,
	like_store_id varchar NULL,
	store_tier_grade varchar NULL,
	comp_date date NULL,
	comp_status varchar NULL,
	channel_id int4 NULL,
	sub_channel varchar NULL,
	longitude float8 NULL,
	latitude float8 NULL,
	total_store_area varchar NULL,
	store_selling_area varchar NULL,
	traffic varchar NULL,
	channel_desc varchar NULL,
	store_open_date date NULL,
	store_close_date date NULL,
	store_type varchar NULL,
	city varchar NULL,
	store_name varchar NULL,
	store_description varchar NULL,
	created_by int4 NULL,
	updated_by int4 NULL,
	created_at timestamptz DEFAULT now() NULL,
	updated_at timestamptz DEFAULT now() NULL,
	CONSTRAINT store_attributes_filter_pk PRIMARY KEY (store_code)
);
CREATE INDEX saf_active_common_idx ON global.store_attributes_filter USING btree (channel, special_classification) WHERE ((active = true) AND (is_deleted = false));
CREATE INDEX saf_common_idx ON global.store_attributes_filter USING btree (channel, special_classification);
