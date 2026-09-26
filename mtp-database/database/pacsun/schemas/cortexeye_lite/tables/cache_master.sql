--liquibase formatted sql
--changeset pranavkumar.singh@impactanalytics.co:cache_master stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for cache_master

CREATE TABLE cortexeye_lite.cache_master (
	id bigserial NOT NULL,
	cache_key varchar(64) NOT NULL,
	request_payload jsonb NOT NULL,
	cache_value jsonb NOT NULL,
	created_at timestamptz DEFAULT now() NOT NULL,
	updated_at timestamptz DEFAULT now() NOT NULL,
	secondary_key varchar(50) DEFAULT 'kpi_data'::character varying NOT NULL,
	CONSTRAINT cache_master_cache_key_key UNIQUE (cache_key),
	CONSTRAINT cache_master_pkey PRIMARY KEY (id)
);
CREATE INDEX idx_cache_master_cache_key ON cortexeye_lite.cache_master USING btree (cache_key);
CREATE INDEX idx_cache_master_key_secondary ON cortexeye_lite.cache_master USING btree (cache_key, secondary_key);
CREATE INDEX idx_cache_master_secondary_key ON cortexeye_lite.cache_master USING btree (secondary_key);