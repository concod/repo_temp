--liquibase formatted sql
--changeset liquibase:slides stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for slides
CREATE TABLE visual_line_planning.slides (
	slide_id uuid DEFAULT gen_random_uuid() NOT NULL,
	grid_layout text NULL,
	slide_type text NULL,
	media_items _jsonb NULL,
	"position" int4 DEFAULT 0 NOT NULL,
	CONSTRAINT slide_pkey PRIMARY KEY (slide_id)
);