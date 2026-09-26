--liquibase formatted sql
--changeset siddharth.upadhyay@impactanalytics.co:store_attributes_filter stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for store_attributes_filter
CREATE TABLE "global".store_attributes_filter (
    -- Mandatory fields
	store_code varchar NOT NULL,
	store_name varchar NOT NULL,
	store_description varchar NULL,
	active bool NULL,
	created_at timestamptz NULL,
	updated_at timestamptz NULL,
	created_by int4 NULL,
	updated_by int4 NULL,
	is_deleted bool NULL,
    -- Patagonia specific attributes from generic schema mapping
	s0_name varchar NOT NULL,
	s0_id varchar NOT NULL,
	inventory_location_code varchar NULL,
	company_code varchar NULL,
	is_retail_store bool NULL,
	channel varchar NOT NULL,
	sub_channel varchar NOT NULL,
	s1_name varchar NOT NULL,
	s2_name varchar NOT NULL,
	s3_name varchar NOT NULL,
	location_type varchar NULL,
	location_sub_type varchar NULL,
	store_number varchar NULL,
	store_opened_date date NULL,
	store_closed_date date NULL,
	is_store_closed bool NULL,
	is_vitrual bool NULL,
	phone varchar NULL,
	address varchar NULL,
	street varchar NULL,
	city varchar NULL,
	state varchar NULL,
	zip_code varchar NULL,
	country varchar NULL,
	is_warehouse_flag bool NULL,
	global varchar NOT NULL,
	region varchar NOT NULL,
	latitude float8 NULL,
	longitude float8 NULL,
	average_daily_traffic float8 NULL,
	store_area float8 NULL,
	stock_square_feet float8 NULL,
	floor_square_feet float8 NULL,
	is_outlet_store bool NULL,
	
	CONSTRAINT store_attributes_filter_pk PRIMARY KEY (store_code),
	CONSTRAINT store_attributes_filter_fk FOREIGN KEY (store_code) REFERENCES "global".store_master(store_code) ON DELETE CASCADE
);

CREATE INDEX store_attributes_filter_s0_name_idx ON global.store_attributes_filter USING btree (s0_name);
CREATE INDEX store_attributes_filter_store_code_idx ON global.store_attributes_filter USING btree (store_code);

--changeset siddharth.upadhyay@impactanalytics.co:store_attributes_filter_chg1 stripComments:false splitStatements:false context:Release_1_0 labels:
--comment:  

ALTER TABLE "global".store_attributes_filter ADD COLUMN IF NOT EXISTS special_classification varchar NULL;
ALTER TABLE "global".store_attributes_filter ADD COLUMN IF NOT EXISTS dc_code int4 NULL;
ALTER TABLE "global".store_attributes_filter ADD COLUMN IF NOT EXISTS fc_code int4 NULL;

--changeset siddharth.upadhyay@impactanalytics.co:store_attributes_filter_chg2 stripComments:false splitStatements:false context:Release_1_0 labels:
--comment: remove s0_id column

ALTER TABLE "global".store_attributes_filter DROP COLUMN IF EXISTS s0_id;

--changeset siddharth.upadhyay@impactanalytics.co:store_attributes_filter_chg3 stripComments:false splitStatements:false context:Release_1_0 labels:
--comment:  currency_code, currency_name, currency_symbol

ALTER TABLE "global".store_attributes_filter ADD COLUMN IF NOT EXISTS currency_code varchar NULL;
ALTER TABLE "global".store_attributes_filter ADD COLUMN IF NOT EXISTS currency_name varchar NULL;
ALTER TABLE "global".store_attributes_filter ADD COLUMN IF NOT EXISTS currency_symbol varchar NULL;