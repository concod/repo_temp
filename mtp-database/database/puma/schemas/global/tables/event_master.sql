--liquibase formatted sql
--changeset soumya.sen@impactanalytics.co:event_master stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for event_master

CREATE TABLE IF NOT EXISTS "global".event_master (
	fiscal_year_week int4 NULL,
	"date" date NULL,
	fiscal_year int4 NULL,
	fiscal_week int4 NULL,
	new_year float8 NULL,
	valentines_day int4 NULL,
	presidents_day int4 NULL,
	st_patricks_day int4 NULL,
	easter int4 NULL,
	mothers_day int4 NULL,
	pre_memorial_day int4 NULL,
	memorial_day int4 NULL,
	fathers_day int4 NULL,
	independence_day int4 NULL,
	puma_bnm_event_2 int4 NULL,
	puma_bnm_event_1 int4 NULL,
	pre_labor_day int4 NULL,
	labor_day int4 NULL,
	thanks_giving int4 NULL,
	post_thanks_giving int4 NULL,
	pre_christmas_1 int4 NULL,
	pre_christmas_2 int4 NULL,
	christmas int4 NULL,
	puma_bnm_event_3 int4 NULL,
	post_independence_day int4 NULL
);

--changeset soumya.sen@impactanalytics.co:event_master_modify stripComments:false splitStatements:false context:MTP-16970 labels:event_master
--comment: changed the datatype of columns in event master to float

ALTER TABLE "global".event_master ALTER COLUMN valentines_day TYPE float8 USING valentines_day::float8;
ALTER TABLE "global".event_master ALTER COLUMN presidents_day TYPE float8 USING presidents_day::float8;
ALTER TABLE "global".event_master ALTER COLUMN st_patricks_day TYPE float8 USING st_patricks_day::float8;
ALTER TABLE "global".event_master ALTER COLUMN easter TYPE float8 USING easter::float8;
ALTER TABLE "global".event_master ALTER COLUMN mothers_day TYPE float8 USING mothers_day::float8;
ALTER TABLE "global".event_master ALTER COLUMN pre_memorial_day TYPE float8 USING pre_memorial_day::float8;
ALTER TABLE "global".event_master ALTER COLUMN memorial_day TYPE float8 USING memorial_day::float8;
ALTER TABLE "global".event_master ALTER COLUMN fathers_day TYPE float8 USING fathers_day::float8;
ALTER TABLE "global".event_master ALTER COLUMN independence_day TYPE float8 USING independence_day::float8;
ALTER TABLE "global".event_master ALTER COLUMN puma_bnm_event_2 TYPE float8 USING puma_bnm_event_2::float8;
ALTER TABLE "global".event_master ALTER COLUMN puma_bnm_event_1 TYPE float8 USING puma_bnm_event_1::float8;
ALTER TABLE "global".event_master ALTER COLUMN pre_labor_day TYPE float8 USING pre_labor_day::float8;
ALTER TABLE "global".event_master ALTER COLUMN labor_day TYPE float8 USING labor_day::float8;
ALTER TABLE "global".event_master ALTER COLUMN thanks_giving TYPE float8 USING thanks_giving::float8;
ALTER TABLE "global".event_master ALTER COLUMN post_thanks_giving TYPE float8 USING post_thanks_giving::float8;
ALTER TABLE "global".event_master ALTER COLUMN pre_christmas_1 TYPE float8 USING pre_christmas_1::float8;
ALTER TABLE "global".event_master ALTER COLUMN pre_christmas_2 TYPE float8 USING pre_christmas_2::float8;
ALTER TABLE "global".event_master ALTER COLUMN christmas TYPE float8 USING christmas::float8;
ALTER TABLE "global".event_master ALTER COLUMN puma_bnm_event_3 TYPE float8 USING puma_bnm_event_3::float8;
ALTER TABLE "global".event_master ALTER COLUMN post_independence_day TYPE float8 USING post_independence_day::float8;