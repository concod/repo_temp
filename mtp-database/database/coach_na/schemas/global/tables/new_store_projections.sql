--liquibase formatted sql
--changeset hemantkumar.bajaj:new_store_projections stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for new_store_projections


-- "global".new_store_projections definition

-- Drop table

-- DROP TABLE "global".new_store_projections;

CREATE TABLE "global".new_store_projections (
	store_code text NOT NULL,
	l0_name text NULL,
	l1_name text NULL,
	l2_name text NULL,
	l3_name text NULL,
	l4_name text NULL,
	l5_name text NULL,
	l6_name text NULL,
	l7_name text NULL,
	projected_units int4 NULL,
	projected_value numeric NULL,
	extra_attributes jsonb DEFAULT '{}'::jsonb NULL,
	created_at timestamp DEFAULT now() NULL,
	updated_at timestamp DEFAULT now() NULL,
	id serial4 NOT NULL,
	sister_store_code text NOT NULL,
	range_name text NULL,
	CONSTRAINT new_store_projections_pkey PRIMARY KEY (id)
);
CREATE INDEX idx_new_store_projections_store_code ON global.new_store_projections USING btree (store_code);

--changeset hemantkumar.bajaj:new_store_projections_v2 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for new_store_projections_v2

ALTER TABLE "global".new_store_projections ADD COLUMN l8_name text NULL;