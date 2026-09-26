--liquibase formatted sql
--changeset adil.nawaz@impactanalytics.co:new_stores stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start

CREATE TABLE IF NOT EXISTS demand_smart.new_stores (
	store_code varchar NOT NULL,
	store_opening_date_default date NOT NULL,
	new_opening_date date NOT NULL,
	new_store_group_id int4 NULL,
	sister_store_mapping_date date NOT NULL,
	created_at timestamptz DEFAULT now() NOT NULL,
	created_by varchar(255) NULL,
	updated_at timestamptz DEFAULT now() NOT NULL,
	updated_by varchar(255) NULL,	
	CONSTRAINT new_stores_pk PRIMARY KEY (store_code)
);