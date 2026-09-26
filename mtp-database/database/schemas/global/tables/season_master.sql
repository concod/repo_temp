--liquibase formatted sql
--changeset liquibase:season_master stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for season_master
CREATE TABLE "global".season_master (
	season_code serial4 NOT NULL,
	"name" varchar NOT NULL,
	season_type varchar NOT NULL,
	season_status bool NOT NULL DEFAULT true,
	"year" int2 NOT NULL,
	season_start_date date NOT NULL,
	season_end_date date NOT NULL,
	attribute_value jsonb NULL,
	CONSTRAINT season_master_pk PRIMARY KEY (season_code, name)
);
--changeset devaraj.jagannath@impactanalytics.co:season_master_alter_1 stripComments:false splitStatements:false context:Release_1_1 labels:MTP-22419
--comment: Added a generated column for season name
--Rollback: alter table  plan_smart.season_master drop column season_display_name;
ALTER TABLE IF EXISTS global.season_master ADD COLUMN season_display_name character varying GENERATED ALWAYS AS (year::text || ' Q' || RIGHT(season_code::text,1)) STORED;