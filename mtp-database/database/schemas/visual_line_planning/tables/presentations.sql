--liquibase formatted sql
--changeset liquibase:presentations stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for presentations
CREATE TABLE visual_line_planning.presentations (
	id uuid NOT NULL,
	title text NOT NULL,
	line_plan_id text NULL,
	template_id text NOT NULL,
	slides jsonb NOT NULL,
	filters jsonb NOT NULL,
	created_at timestamptz NOT NULL,
	updated_at timestamptz NOT NULL,
	line_plan_ids _text NULL,
	is_updated bool DEFAULT false NOT NULL,
	CONSTRAINT presentations_pkey PRIMARY KEY (id)
);

--changeset shannonnelson.d@impactanalytics.co:presentations_align_with_presentations_mod stripComments:false splitStatements:false context:Release_1_1 labels:schema_alignment
--comment: Align presentations table schema with presentations_mod to consolidate into single table
TRUNCATE TABLE visual_line_planning.presentations CASCADE;
ALTER TABLE visual_line_planning.presentations RENAME COLUMN id TO presentation_id;
ALTER TABLE visual_line_planning.presentations DROP COLUMN slides;
ALTER TABLE visual_line_planning.presentations DROP COLUMN line_plan_id;
ALTER TABLE visual_line_planning.presentations DROP COLUMN line_plan_ids;
ALTER TABLE visual_line_planning.presentations ALTER COLUMN title DROP NOT NULL;
ALTER TABLE visual_line_planning.presentations ALTER COLUMN template_id DROP NOT NULL;
ALTER TABLE visual_line_planning.presentations ALTER COLUMN filters DROP NOT NULL;
ALTER TABLE visual_line_planning.presentations ALTER COLUMN filters SET DEFAULT '{}'::jsonb;
ALTER TABLE visual_line_planning.presentations ALTER COLUMN created_at SET DEFAULT now();
ALTER TABLE visual_line_planning.presentations ALTER COLUMN updated_at SET DEFAULT now();