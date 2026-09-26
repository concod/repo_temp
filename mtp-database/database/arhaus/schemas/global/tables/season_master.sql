--liquibase formatted sql
--changeset archa.prakash@impactanalytics.co:Arhaus_season_master stripComments:false splitStatements:false context:Release_1_0 labels:season_master_setup_arhaus
--comment: initial changeset for season_master_arhaus
CREATE TABLE "global".season_master (
	season_code serial4 NOT NULL,
	"name" varchar NOT NULL,
	season_type varchar NOT NULL,
	season_status bool NOT NULL DEFAULT true,
	"year" int2 NOT NULL,
	season_start_date date NOT NULL,
	season_end_date date NOT NULL,
	attribute_value jsonb NULL,
	season_display_name varchar NULL GENERATED ALWAYS AS (((year::text || ' Q'::text) || "right"(season_code::text, 1))) STORED,
	"{rtf1ansiansicpg1252cocoartf2758" varchar(128) NULL,
	CONSTRAINT season_master_pk PRIMARY KEY (season_code, name)
);