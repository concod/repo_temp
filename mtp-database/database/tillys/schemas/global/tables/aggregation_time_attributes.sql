--liquibase formatted sql
--changeset gauri.nair@impactanalytics.co:aggregation_time_attributes_tillys_test stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_starts_3
--comment: initial changeset for aggregation_time_attributes_tillys


CREATE TABLE if not exists "global".aggregation_time_attributes (
	aggregation_code varchar NOT NULL,
	attribute_name varchar NOT NULL,
	attribute_value varchar NOT NULL,
	start_time date DEFAULT '1990-01-01'::date NOT NULL,
	end_time date DEFAULT '2045-12-31'::date NOT NULL,
	aggregation_time_attr_id bigserial NOT NULL,
	updated_by int4 NULL,
	updated_at timestamptz NULL,
	CONSTRAINT aggregation_time_attributes_check CHECK ((end_time >= start_time)),
	CONSTRAINT aggregation_time_attributes_pk PRIMARY KEY (aggregation_time_attr_id),
	CONSTRAINT aggregation_time_attributes_updated_by_fk FOREIGN KEY (updated_by) REFERENCES "global".user_master(user_code) ON DELETE SET NULL
);
CREATE INDEX if not exists aggregation_time_attributes_idx ON global.aggregation_time_attributes USING btree (aggregation_code);

--changeset gauri.nair@impactanalytics.co:aggregation_time_attributes_tillys_3 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_starts_3
--comment: add columns changeset for aggregation_time_attributes_3

ALTER TABLE "global".aggregation_time_attributes
  ADD COLUMN IF NOT EXISTS department varchar NULL,
  ADD COLUMN IF NOT EXISTS subdepartment varchar NULL,
  ADD COLUMN IF NOT EXISTS class varchar NULL,
  ADD COLUMN IF NOT EXISTS subclass varchar NULL,
  ADD COLUMN IF NOT EXISTS vendor_name varchar NULL,
  ADD COLUMN IF NOT EXISTS color_id_name varchar NULL,
  ADD COLUMN IF NOT EXISTS style_color_desc varchar NULL;
