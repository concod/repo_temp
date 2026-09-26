--liquibase formatted sql
--changeset ashish@impactanalytics.co:store_attributes_filter stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for store_attributes_filter
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
	s0_name varchar NULL,
	s1_name varchar NULL,
	s2_name varchar NULL,
	s3_name varchar NULL,
	s4_name varchar NULL,
	channel varchar NOT NULL,
	channel_group varchar NULL,
	climate varchar NULL,
	close_date date NULL,
	country varchar NULL,
	dc_flag bool NOT NULL,
	dc_name varchar NULL,
	district varchar NULL,
	latitude float8 NULL,
	longitude float8 NULL,
	open_date date NULL,
	region varchar NULL,
	retail_facility_code varchar NULL,
	s0_id varchar NOT NULL,
	s1_id varchar NULL,
	s2_id varchar NULL,
	store_size varchar NULL,
	zipcode varchar NULL,
	store_comp_status_cd varchar NULL,
	CONSTRAINT store_attributes_filter_pk PRIMARY KEY (store_code)
);
ALTER TABLE "global".store_attributes_filter ADD CONSTRAINT store_attributes_filter_fk FOREIGN KEY (store_code) REFERENCES "global".store_master(store_code) ON DELETE CASCADE;

--changeset shreyan.haldankar@impactanalytics.co:store_attributes_filter stripComments:false splitStatements:false context:Release_1_1 labels:MTP-64814
--comment: add forecasting_channel column for store_attributes_filter
ALTER TABLE "global".store_attributes_filter ADD COLUMN IF NOT EXISTS forecasting_channel varchar NULL;

--changeset sidhartha.c@impactanalytics.co:store_attributes_filter stripComments:false splitStatements:false context:Release_1_1_1 labels:MTP-64814
--comment: add forecasting_channel column for store_attributes_filter
ALTER TABLE "global".store_attributes_filter 
ADD COLUMN IF NOT EXISTS currency_cd VARCHAR,
ADD COLUMN IF NOT EXISTS district_id VARCHAR,
ADD COLUMN IF NOT EXISTS retail_territory_code VARCHAR,
ADD COLUMN IF NOT EXISTS rtl_zone_id VARCHAR,
ADD COLUMN IF NOT EXISTS is_new BOOLEAN;

--changeset sidhartha.c@impactanalytics.co:store_attributes_filter_gsm stripComments:false splitStatements:false context:Release_1_1_1_ labels:MTP-64814
--comment: add forecasting_channel column for store_attributes_filter
ALTER TABLE "global".store_attributes_filter
ALTER COLUMN district_id TYPE INTEGER USING district_id::INTEGER;

--changeset kuldeep.rathore@impactanalytics.co:retail_region_saf_new stripComments:false splitStatements:false context:Release_1 labels:MTP-64814
--comment: adding retail_region in SAF APAC test new
ALTER TABLE global.store_attributes_filter
ADD retail_region varchar NULL;


--changeset darsh.badukle@impactanalytics.co:columns_add_location stripComments:false splitStatements:false context:columns_add_location labels:MTP-64814
--comment: adding location columns in SAF APAC test new
ALTER TABLE global.store_attributes_filter
ADD COLUMN IF NOT EXISTS ax_batch_id varchar,
ADD COLUMN IF NOT EXISTS ax_entity varchar,
ADD COLUMN IF NOT EXISTS apac_location_id varchar;