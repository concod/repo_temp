--liquibase formatted sql
--changeset tania.bhattacharya@impactanalytics.co:store_attributes_filter stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for store_attributes_filter

CREATE TABLE "global".store_attributes_filter (
	store_code varchar NOT NULL,
	country varchar NULL,
	channel varchar NULL,
	store_close_date date NULL,
	location_type varchar NULL,
	store_open_date date NULL,
	zip_code varchar NULL,
	active bool NOT NULL,
	special_classification varchar NULL,
	is_deleted bool NULL,
	store_name varchar NULL,
	single_store_desc varchar NULL,
	latitude float8 NULL,
	longitude float8 NULL,
	city varchar NULL,
	s3_name varchar NULL,
	master_cpy_id int8 NULL,
	s0_name varchar NULL,
	small_cpy_sk int8 NULL,
	s1_name varchar NULL,
	small_cpy_ol_split_id varchar NULL,
	standalone_storetypes_eu varchar NULL,
	no_of_floors_eu varchar NULL,
	tusa_avg int8 NULL,
	store_sizing varchar NULL,
	store_description text NULL,
	s2_name varchar NULL,
	country_channel varchar NULL,
	updated_at timestamptz NULL,
	created_at timestamptz NULL,
	created_by int4 NULL,
	updated_by int4 NULL,
	dc_code int4 NULL,
	fc_code int4 NULL,
	master_cpy_country varchar NULL,
	climate varchar NULL,
	location_channel varchar NULL,
	CONSTRAINT store_attributes_filter_pk PRIMARY KEY (store_code)
);
CREATE INDEX saf_active_common_idx ON global.store_attributes_filter USING btree (channel, special_classification) WHERE ((active = true) AND (is_deleted = false));
CREATE INDEX saf_common_idx ON global.store_attributes_filter USING btree (channel, special_classification);

--changeset tania.bhattacharya@impactanalytics.co:store_attributes_filter_v1 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: added new columns in SAF table
ALTER TABLE "global".store_attributes_filter ADD COLUMN IF NOT EXISTS sub_channel varchar NULL;
