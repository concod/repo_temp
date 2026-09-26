--liquibase formatted sql
--changeset kumaran.k@impactanalytics.co:store_attributes_filter_v3  stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for store_attributes_filter_v3

DROP TABLE IF EXISTS "global".store_attributes_filter CASCADE;
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
	country varchar NULL,
	city varchar NULL,
	address varchar NULL,
	address_2 varchar NULL,
	open_date date NULL,
	closed bool NULL,
	compqualify_date date NULL,
	corporate int4 NULL,
	corporate_description varchar NULL,
	county varchar NULL,
	dma varchar NULL,
	state varchar NULL,
	store_name_heading varchar NULL,
	loyalty_scheme varchar NULL,
	business varchar NULL,
	channel varchar NULL,
	CONSTRAINT store_attributes_filter_pk PRIMARY KEY (store_code),
	CONSTRAINT store_attributes_filter_fk FOREIGN KEY (store_code) REFERENCES "global".store_master(store_code) ON DELETE CASCADE
);


--changeset liquibase:kumaran.k@impactanalytics.co:store_attributes_filter_v4 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for kumaran.k@impactanalytics.co:store_attributes_filter_v4
ALTER TABLE "global".store_attributes_filter
ALTER COLUMN special_classification SET DEFAULT 'NA';

UPDATE "global".store_attributes_filter
SET special_classification = 'NA'
WHERE special_classification IS NULL;
