--liquibase formatted sql
--changeset liquibase:subboards stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for subboards
CREATE TABLE visual_line_planning.subboards (
	id uuid NOT NULL,
	"name" text NOT NULL,
	"position" jsonb NOT NULL,
	"size" jsonb NOT NULL,
	canvas_data text NULL,
	moodboard_id uuid NOT NULL,
	"index" int4 NOT NULL,
	CONSTRAINT subboards_pkey PRIMARY KEY (id),
	CONSTRAINT subboards_moodboards_fk FOREIGN KEY (moodboard_id) REFERENCES visual_line_planning.moodboards(id) ON DELETE CASCADE
);
CREATE INDEX idx_subboards_index ON visual_line_planning.subboards USING btree (moodboard_id, index);
CREATE INDEX idx_subboards_moodboard_id ON visual_line_planning.subboards USING btree (moodboard_id);