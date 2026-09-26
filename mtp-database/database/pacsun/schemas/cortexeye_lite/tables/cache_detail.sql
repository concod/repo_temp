--liquibase formatted sql
--changeset pranavkumar.singh@impactanalytics.co:cache_detail stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for cache_detail

CREATE TABLE cortexeye_lite.cache_detail (
	id bigserial NOT NULL,
	cache_key varchar(128) NOT NULL,
	cache_value jsonb NOT NULL,
	"order" int4 NOT NULL,
	created_at timestamptz DEFAULT now() NOT NULL,
	secondary_key varchar(50) DEFAULT 'kpi_data'::character varying NOT NULL,
	request_payload jsonb DEFAULT '{}'::jsonb NOT NULL,
	CONSTRAINT cache_detail_pkey PRIMARY KEY (id),
	CONSTRAINT unique_cache_key_order UNIQUE (cache_key, "order")
);
CREATE INDEX idx_cache_detail_key_order ON cortexeye_lite.cache_detail USING btree (cache_key, "order");
CREATE INDEX idx_cache_detail_key_secondary_order ON cortexeye_lite.cache_detail USING btree (cache_key, secondary_key, "order");
CREATE INDEX idx_cache_detail_secondary_key ON cortexeye_lite.cache_detail USING btree (secondary_key);