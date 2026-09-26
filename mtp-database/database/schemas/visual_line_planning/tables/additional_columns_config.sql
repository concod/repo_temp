--liquibase formatted sql
--changeset shannonnelson.d@impactanalytics.co:additional_columns_config stripComments:false splitStatements:false context:Release_1_0 labels:schema_alignment
--comment: initial changeset for additional_columns_config
CREATE TABLE visual_line_planning.additional_columns_config (
	line_plan_id uuid NOT NULL,
	"type" varchar(255) NULL,
	header_name varchar(255) NOT NULL,
	field varchar(255) NULL,
	"options" _text DEFAULT '{}'::text[] NOT NULL,
	is_multi bool NULL,
	description varchar(255) NULL,
	CONSTRAINT additional_columns_config_pk PRIMARY KEY (line_plan_id, header_name),
	CONSTRAINT additional_columns_config_unique UNIQUE (line_plan_id, header_name),
	CONSTRAINT additional_columns_config_line_plan_fk FOREIGN KEY (line_plan_id) REFERENCES visual_line_planning.line_plan(line_plan_id) ON DELETE CASCADE
);