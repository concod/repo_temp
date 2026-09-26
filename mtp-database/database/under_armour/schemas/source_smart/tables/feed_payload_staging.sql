--liquibase formatted sql
--changeset liquibase:feed_payload_staging stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for feed_payload_staging

CREATE TABLE source_smart.feed_payload_staging (
	id uuid DEFAULT gen_random_uuid() NOT NULL,
	operation_id uuid NOT NULL,
	payload jsonb NULL,
	created_at timestamptz DEFAULT now() NOT NULL,
	payload_compressed bytea NULL,
	CONSTRAINT feed_payload_staging_pkey PRIMARY KEY (id)
);