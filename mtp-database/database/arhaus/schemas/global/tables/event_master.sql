--liquibase formatted sql
--changeset hari.krishna@impactanalytics.co:event_master stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for event_master
CREATE TABLE "global".event_master (
	purim text NULL,
	easter text NULL,
	ny_day text NULL,
	oscars text NULL,
	mlk_day text NULL,
	hanukkah text NULL,
	passover text NULL,
	christmas text NULL,
	dr_seuss text NULL,
	halloween text NULL,
	labor_day text NULL,
	superbowl text NULL,
	mardi_gras text NULL,
	yom_kippur text NULL,
	black_friday text NULL,
	columbus_day text NULL,
	fathers_day text NULL,
	memorial_day text NULL,
	mothers_day text NULL,
	new_year_eve text NULL,
	thanksgiving text NULL,
	veterans_day text NULL,
	cinco_de_mayo text NULL,
	pre_superbowl text NULL,
	rosh_hashanah text NULL,
	web_oms_issue text NULL,
	fourth_of_july text NULL,
	kentucky_derby text NULL,
	presidents_day text NULL,
	valentines_day text NULL,
	chinese_new_year text NULL,
	st_patricks_day text NULL,
	last_day_for_halloween_returns text NULL,
	good_friday text NULL,
	independence_day text NULL,
	winter_warm_up text NULL,
	"date" date NULL
);

--changeset ashish@impactanalytics.co:event_master_pk stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for event_master
ALTER TABLE "global".event_master ALTER COLUMN "date" SET NOT NULL;
ALTER TABLE "global".event_master ADD CONSTRAINT event_master_pk PRIMARY KEY ("date");
