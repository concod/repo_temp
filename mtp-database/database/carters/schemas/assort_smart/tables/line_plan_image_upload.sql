--liquibase formatted sql
--changeset hemanth.cs@impactanalytics.co:assort_smart.line_plan_image_upload_add_not_exists stripComments:false splitStatements:false context:MTP-75018 labels:initial_changeset
--comment: initial changeset for line_plan_image_upload

-- DROP TABLE assort_smart.line_plan_image_upload;

CREATE TABLE IF NOT EXISTS assort_smart.line_plan_image_upload (
	id bigserial NOT NULL,
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
	channel varchar(255) NULL,
	CONSTRAINT line_plan_image_upload_pkey PRIMARY KEY (id),
	CONSTRAINT unique_style_hierarchy_code UNIQUE (style_id, hierarchy_code)
);