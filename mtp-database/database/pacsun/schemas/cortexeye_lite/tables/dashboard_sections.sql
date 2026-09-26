--liquibase formatted sql
--changeset pranavkumar.singh@impactanalytics.co:dashboard_sections stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for dashboard_sections

CREATE TABLE cortexeye_lite.dashboard_sections (
	id bigserial NOT NULL,
	dashboard_id int8 NOT NULL,
	title varchar NOT NULL,
	section_type varchar NOT NULL,
	row_index int4 NULL,
	display_order int8 NULL,
	span int4 NULL,
	created_at timestamptz DEFAULT now() NULL,
	updated_at timestamptz DEFAULT now() NULL,
	CONSTRAINT dashboard_sections_pkey PRIMARY KEY (id)
);
