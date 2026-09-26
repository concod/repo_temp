--liquibase formatted sql
--changeset arun.thamma@impactanalytics.co:event_mapping_sense_check stripComments:false splitStatements:false context:Release_1_0 labels:ada_team_cr
--comment: initial changeset for event_mapping_sense_check

-- DROP TABLE "global".event_mapping_sense_check;

CREATE TABLE "global".event_mapping_sense_check (
	fiscal_year_week int4 NULL,
	fiscal_week int4 NULL,
	fiscal_year int4 NULL,
	event_name text NULL,
	ly_year_week int4 NULL
);
