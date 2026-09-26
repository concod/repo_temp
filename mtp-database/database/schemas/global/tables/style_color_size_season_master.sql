--liquibase formatted sql
--changeset liquibase:style_color_size_season_master stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
CREATE TABLE "global".style_color_size_season_master (
	style_color_size_season_code varchar NOT NULL,
	is_deleted bool NOT NULL DEFAULT false,
	created_at timestamptz NOT NULL DEFAULT now(),
	updated_at timestamptz NOT NULL DEFAULT now(),
	"level" varchar NOT NULL,
	attribute_value jsonb NOT NULL,
	CONSTRAINT style_color_size_season_master_pk PRIMARY KEY (style_color_size_season_code)
);