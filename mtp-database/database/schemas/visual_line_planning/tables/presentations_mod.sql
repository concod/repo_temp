--liquibase formatted sql
--changeset liquibase:presentations_mod stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for presentations_mod
CREATE TABLE visual_line_planning.presentations_mod (
	presentation_id uuid NOT NULL,
	template_id text NULL,
	filters jsonb DEFAULT '{}'::jsonb NULL,
	created_at timestamptz DEFAULT now() NOT NULL,
	updated_at timestamptz DEFAULT now() NOT NULL,
	is_updated bool DEFAULT false NOT NULL,
	title text NULL,
	CONSTRAINT presentation_pkey PRIMARY KEY (presentation_id)
);