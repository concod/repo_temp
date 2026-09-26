-- liquibase formatted sql
-- changeset akashkumar.rana@impactanalytics.co:product_profile_modifications stripComments:false splitStatements:false context:FINAL-SIZE-SMART-SCHEMA-MODIFICATIONS labels:FINAL-SIZE-SMART-SCHEMA-MODIFICATIONS 
-- comment: update changeset for product_profile

CREATE TABLE  size_smart.product_profile (
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
	timeline text NULL
);