--liquibase formatted sql
--changeset liquibase:event_master stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for event_master
CREATE TABLE "global".event_master (
	pre_valentines_day int2 DEFAULT 0,
	valentines_day int2 DEFAULT 0,
	pre_mothers_day int2 DEFAULT 0,
	mothers_day int2 DEFAULT 0,
	halloween int2 DEFAULT 0,
	pre_thanks_giving int2 DEFAULT 0,
	thanks_giving int2 DEFAULT 0,
	pre_christmas_1 int2 DEFAULT 0,
	pre_christmas_2 int2 DEFAULT 0,
	christmas int2 DEFAULT 0,
	"date" date NOT NULL,
	CONSTRAINT event_date_un PRIMARY KEY (date)
);
CREATE INDEX event_master_date_idx ON global.event_master USING btree (date);
