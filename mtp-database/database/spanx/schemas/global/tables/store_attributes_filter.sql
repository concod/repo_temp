--liquibase formatted sql
--changeset liquibase:product_attributes_filter stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for product_attributes_filter

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
	s0_name varchar NULL,
	s1_name varchar NULL,
	s2_name varchar NULL,
	address_1 varchar NULL,
	address_2 varchar NULL,
	channel varchar NULL,
	close_date date NULL,
	dc_vendor varchar NULL,
	dc_vendor_flag bool NULL,
	open_date date NULL,
	zipcode varchar NULL,
	CONSTRAINT store_attributes_filter_pk PRIMARY KEY (store_code),
	CONSTRAINT store_attributes_filter_fk FOREIGN KEY (store_code) REFERENCES "global".store_master(store_code) ON DELETE CASCADE
);

--changeset priyaranjan.pradhan@impactanalytics.co:store_attributes_filter stripComments:false splitStatements:false context:add_saf labels:add_saf
--comment: saf addition changeset for store_attributes_filter

ALTER TABLE "global".store_attributes_filter ADD COLUMN IF NOT EXISTS dc_name varchar NULL;
