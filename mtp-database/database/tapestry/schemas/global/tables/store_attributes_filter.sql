-- liquibase formatted sql
-- changeset shrinidhi.choragi@impactanalytics.co:store_attributes_filter stripComments:false splitStatements:false context:TP-64270_1 labels:MTP-64270_1
-- comment: initial changeset for store_attributes_filter change for if exists

-- "global".store_attributes_filter definition
-- DROP TABLE "global".store_attributes_filter;

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
	sales_org_name varchar NOT NULL,
	region_name varchar NOT NULL,
	channel varchar NULL,
	close_date date NULL,
	dc_flag bool NOT NULL,
	dc_name varchar NULL,
	fulfillment_store_code varchar NULL,
	latitude varchar NULL,
	longitude varchar NULL,
	open_date date NULL,
	postal_code varchar NULL,
	profit_centre_code varchar NULL,
	profit_centre_name varchar NULL,
	sales_org_id varchar NOT NULL,
	store_name_display varchar NOT NULL,
	store_type varchar NULL,
	q_str_grade varchar NULL,
	CONSTRAINT store_attributes_filter_pk PRIMARY KEY (store_code),
	CONSTRAINT store_attributes_filter_fk FOREIGN KEY (store_code) REFERENCES "global".store_master(store_code) ON DELETE CASCADE
);