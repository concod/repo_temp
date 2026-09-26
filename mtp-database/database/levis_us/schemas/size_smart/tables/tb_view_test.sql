-- liquibase formatted sql
-- changeset rakshith.kr@impactanalytics.co:tb_view_test_modifications stripComments:false splitStatements:false context:FINAL-SIZE-SMART-SCHEMA-MODIFICATIONS labels:FINAL-SIZE-SMART-SCHEMA-MODIFICATIONS 
-- comment: updated changeset for tb_view_test
-- rollback: DROP TABLE IF EXISTS size_smart.tb_view_test;

CREATE TABLE size_smart.tb_view_test (
	l0_name text NULL,
	l6_name text NULL,
	l1_name text NULL,
	global_fit_platform text NULL,
	l3_name text NULL,
	l4_name text NULL,
	l5_name text NULL,
	l7_code text NULL,
	display_article text NULL,
	size_range_id int4 NULL,
	rule_id int4 NULL,
	ruleset_id int4 NULL,
	rule_tag text NULL,
	escalation_level text NULL,
	size_range text NULL,
	"attributes" text NULL,
	timeline text NULL,
	size_profile_id int4 NULL
);