--liquibase formatted sql
--changeset liquibase:moodboards stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for moodboards
CREATE TABLE visual_line_planning.moodboards (
	id uuid NOT NULL,
	"name" text NOT NULL,
	category text NOT NULL,
	description text NULL,
	created_at timestamptz NOT NULL,
	updated_at timestamptz NOT NULL,
	"hierarchy" jsonb NULL,
	canvas_position jsonb NULL,
	canvas_scale float8 NULL,
	CONSTRAINT moodboards_pkey PRIMARY KEY (id)
);
CREATE INDEX idx_moodboards_category ON visual_line_planning.moodboards USING btree (category);
CREATE INDEX idx_moodboards_name ON visual_line_planning.moodboards USING btree (name);
