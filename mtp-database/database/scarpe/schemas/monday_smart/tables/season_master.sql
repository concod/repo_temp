--liquibase formatted sql
--changeset sivaprasath.vadivel@impactanalytics.co:dimension_attributes_internal stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for dimension_attribute_mapping

CREATE TABLE monday_smart.season_master (
	season_code int4 DEFAULT 0 NULL,
	"name" varchar NOT NULL,
	season_type varchar NOT NULL,
	season_status bool DEFAULT true NOT NULL,
	"year" int2 NOT NULL,
	season_start_date date NOT NULL,
	season_end_date date NOT NULL,
	start_week int4 NOT NULL,
	end_week int4 NOT NULL,
	attribute_value jsonb NULL,
	season_display_name varchar NULL
);