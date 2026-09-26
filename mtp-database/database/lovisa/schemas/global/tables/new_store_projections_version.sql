--liquibase formatted sql
--changeset aleena.reji:new_store_projections_version_v1 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for new_store_projections_version_v1

-- DROP TABLE "global".new_store_projections_version;

CREATE TABLE if NOT EXISTS "global".new_store_projections_version (
	version_code int4 NOT NULL,
	id serial4 NOT NULL,
	store_code text NOT NULL,
	sister_store_code text NOT NULL,
	l0_name text NULL,
	l1_name text NULL,
	l2_name text NULL,
	l3_name text NULL,
	projected_units int4 NULL,
	projected_value numeric NULL,
	extra_attributes jsonb DEFAULT '{}'::jsonb NULL,
	created_at timestamp DEFAULT now() NULL,
	updated_at timestamp DEFAULT now() NULL,
	launch_date date NULL,
	brand text NULL,
	store_code_name text NULL,
	style_color_description text NULL,
	store_name text NULL,
	s0_name text NULL,
	channel text NULL,
	channel_name text NULL,
	multiplier numeric NULL,
	wos numeric NULL,
	range_name varchar NULL,
    l4_name varchar NULL,
    l5_name varchar NULL,
    l6_name varchar NULL,
	CONSTRAINT new_store_projections_version_pkey PRIMARY KEY (version_code, id)
)
PARTITION BY LIST (version_code);
CREATE INDEX IF NOT EXISTS idx_new_store_projections_store_code ON global.new_store_projections_version USING btree (store_code);
