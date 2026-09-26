--liquibase formatted sql
--changeset liquibase:event_master stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for event_master
CREATE TABLE "global".event_master (
	christmas int2 DEFAULT 0,
	columbus_day int2 DEFAULT 0,
	easter int2 DEFAULT 0,
	fathers_day int2 DEFAULT 0,
	good_friday int2 DEFAULT 0,
	halloween int2 DEFAULT 0,
	independence_day int2 DEFAULT 0,
	labor_day int2 DEFAULT 0,
	mlk_day int2 DEFAULT 0,
	memorial_day int2 DEFAULT 0,
	mothers_day int2 DEFAULT 0,
	new_year int2 DEFAULT 0,
	presidents_day int2 DEFAULT 0,
	st_patricks_day int2 DEFAULT 0,
	thanks_giving int2 DEFAULT 0,
	valentines_day int2 DEFAULT 0,
	winter_warm_up int2 DEFAULT 0,
	"date" date NOT NULL
);
CREATE INDEX event_master_date_idx ON global.event_master USING btree (date);
