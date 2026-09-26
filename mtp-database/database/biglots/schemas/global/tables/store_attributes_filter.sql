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
	s0_name varchar NOT NULL,
	s1_name varchar NOT NULL,
	s2_name varchar NOT NULL,
	s3_name varchar NOT NULL,
	channel varchar NULL,
	city varchar NULL,
	district varchar NULL,
	region varchar NULL,
	state varchar NULL,
	zipcode varchar NULL,
	CONSTRAINT store_attributes_filter_pk PRIMARY KEY (store_code)
);
ALTER TABLE "global".store_attributes_filter ADD CONSTRAINT store_attributes_filter_fk FOREIGN KEY (store_code) REFERENCES "global".store_master(store_code) ON DELETE CASCADE;

--changeset ashish@impactanalytics.co:store_attributes_filter_idx stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: store_attributes_filter FK
CREATE INDEX saf_active_common_idx ON "global".store_attributes_filter(channel, special_classification) WHERE active = true and is_deleted = false;
CREATE INDEX saf_common_idx ON "global".store_attributes_filter(channel, special_classification);
