-- liquibase formatted sql
-- changeset sreevathsa.sp@impactanalytics.co:store_attributes_filter_v2 stripComments:false splitStatements:false context:TP-64270_1 labels:store_attributes_filter_v1
-- comment: initial changeset for store_attributes_filter change for if exists

-- "global".store_attributes_filter definition
-- DROP TABLE if exists "global".store_attributes_filter;

CREATE TABLE if not exists "global".store_attributes_filter (
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
	s1_id_name varchar NOT NULL,
	s2_id_name varchar NOT NULL,
	s3_id_name varchar NOT NULL,
	channel varchar NULL,
	channel_group varchar NULL,
	city_name varchar NULL,
	climate varchar NULL,
	close_date date NULL,
	country_name varchar NULL,
	dc_flag bool NOT NULL,
	dc_name varchar NULL,
	district varchar NOT NULL,
	latitude int4 NULL,
	longitude int4 NULL,
	open_date date NULL,
	s0_id varchar NOT NULL,
	s0_id_name varchar NOT NULL,
	s1_id varchar NOT NULL,
	s1_name varchar NOT NULL,
	s2_id varchar NOT NULL,
	s2_name varchar NOT NULL,
	s3_id varchar NOT NULL,
	s3_name varchar NULL,
	s4_name varchar NULL,
	state_name varchar NULL,
	store_code_name varchar NOT NULL,
	store_display_num varchar NOT NULL,
	store_selling_size varchar NULL,
	store_size varchar NULL,
	store_tier varchar NULL,
	zipcode varchar NULL,
	store_type varchar NULL,
CONSTRAINT store_attributes_filter_pk PRIMARY KEY (store_code),
CONSTRAINT store_attributes_filter_fk FOREIGN KEY (store_code) REFERENCES "global".store_master(store_code) ON DELETE CASCADE
);

-- changeset sreevathsa.sp@impactanalytics.co:store_attributes_filter_add_unit_capacity stripComments:false splitStatements:false context:TP-64270_1 labels:pacsun_store_attributes_filter_add_unit_capacity
-- comment: add_unit_capacity for store_attributes_filter
ALTER TABLE "global".store_attributes_filter ADD COLUMN IF NOT EXISTS unit_capacity int4 NULL;

-- changeset sreevathsa.sp@impactanalytics.co:store_attributes_filter_change_datatype_lat_long stripComments:false splitStatements:false context:TP-64270_1 labels:pacsun_store_attributes_filter_change_datatype_lat_long
-- comment: store_attributes_filter_change_datatype_lat_long
ALTER TABLE "global".store_attributes_filter ALTER COLUMN latitude TYPE float USING latitude::float;
ALTER TABLE "global".store_attributes_filter ALTER COLUMN longitude TYPE float USING longitude::float;

-- changeset sreevathsa.sp@impactanalytics.co:store_attributes_filter_add_like_store_id stripComments:false splitStatements:false context:TP-64270_1 labels:pacsun_store_attributes_filter_add_like_store_id
-- comment: store_attributes_filter_add_like_store_id
ALTER TABLE "global".store_attributes_filter ADD COLUMN IF NOT EXISTS like_store_id varchar NULL;

-- changeset sreevathsa.sp@impactanalytics.co:store_attributes_filter_add_loc_id_loc_key stripComments:false splitStatements:false context:TP-64270_1 labels:pacsun_store_attributes_filter_add_loc_id_loc_key
-- comment: store_attributes_filter_add_loc_id_loc_key
ALTER TABLE "global".store_attributes_filter add column if not exists loc_key varchar null;
ALTER TABLE "global".store_attributes_filter add column if not exists loc_id varchar null;

-- changeset bhaskar.reddy@impactanalytics.co:store_attributes_filter_add_like_channel_name stripComments:false splitStatements:false context:TP-64270_1 labels:pacsun_store_attributes_filter_add_like_channel_name
-- comment: store_attributes_filter_add_like_channel_name
ALTER TABLE "global".store_attributes_filter ADD COLUMN IF NOT EXISTS channel_name varchar NULL;

-- changeset bhaskar.reddy@impactanalytics.co:store_attributes_filter_add_like_s10_name stripComments:false splitStatements:false context:TP-64270_1 labels:pacsun_store_attributes_filter_add_like_channel_name
-- comment: store_attributes_filter_add_like_s10_name
ALTER TABLE "global".store_attributes_filter ADD COLUMN IF NOT EXISTS s10_name varchar NULL;
