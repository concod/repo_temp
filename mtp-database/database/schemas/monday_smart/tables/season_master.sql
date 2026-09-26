--liquibase formatted sql
--changeset liquibase:season_master_create stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for season_master_create
CREATE TABLE monday_smart.season_master (
	season_code int4  NULL DEFAULT 0,
	"name" varchar NOT NULL,
	season_type varchar NOT NULL,
	season_status boolean NOT NULL DEFAULT true,
	"year" int2 NOT NULL,
	season_start_date date NOT NULL,
	season_end_date date NOT NULL,
	start_week int4 NOT NULL,
	end_week int4 NOT NULL,
	attribute_value jsonb NULL,
	season_display_name varchar NULL
);