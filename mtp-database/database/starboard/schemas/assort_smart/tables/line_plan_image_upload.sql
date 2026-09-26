--liquibase formatted sql
--changeset pulimallika.teja@impactanalytics.co:line_plan_choice_image_upload table  liquibase:line_plan_choice_launch stripComments:false splitStatements:false context:line_plan_choice_image_upload table labels:liquibase_project_start
--comment: initial changeset for line_plan_choice_image_upload

CREATE TABLE assort_smart.line_plan_image_upload (
	id serial4 NOT NULL,
	hierarchy_code varchar(255) NOT NULL,
	style_id varchar(255) NULL,
	color_id varchar(255) NULL,
	placeholder_id varchar(255) NULL,
	image varchar(255) NULL,
	"attributes" jsonb NULL,
	created_at timestamp DEFAULT CURRENT_TIMESTAMP NULL,
	updated_at timestamp DEFAULT CURRENT_TIMESTAMP NULL,
	created_by varchar(255) NULL,
	style_name varchar(255) NULL,
	article varchar(255) NULL,
	tableau_image_link varchar(255) NULL,
	choice_id varchar(255) NULL,
	min_per_order varchar NULL,
	marketing varchar NULL,
	size_range_type varchar NULL,
	relevant_sizes text NULL,
	channel text NULL,
	air float8 NULL,
	auc float8 NULL,
	color_name varchar NULL,
	style_color varchar NULL,
	is_image_mapped bool DEFAULT false NULL,
	CONSTRAINT line_plan_image_upload_pkey PRIMARY KEY (id),
	CONSTRAINT unique_style_hierarchy UNIQUE (style_color, hierarchy_code)
);

--changeset ayush.chouksey@impactanalytics.co:add_season_code stripComments:false splitStatements:false context:add_season_code labels:add_season_code
--comment: Add season_code column to track style-season mapping
ALTER TABLE assort_smart.line_plan_image_upload
ADD COLUMN season_code int4 NULL;