--liquibase formatted sql
--changeset akashkumar.rana@impactanalytics.co:last_season_size_ratio stripComments:false splitStatements:false context:Release_1_0_03 labels:levis_test_03
--comment: added last_season_size_ratio table


CREATE TABLE size_smart.last_season_size_ratio (
	display_article varchar(255) NULL,
	l0_name varchar(255) NOT NULL,
	l1_name varchar(255) NOT NULL,
	l3_name varchar(255) NOT NULL,
	l4_name varchar(255) NOT NULL,
	l5_name varchar(255) NOT NULL,
	l6_name varchar(255) NOT NULL,
	store_code varchar(255) NOT NULL,
	l7_code varchar(255) NOT NULL,
	"size" varchar(255) NULL,
	season varchar(255) NOT NULL,
	fiscal_year_week int4 NULL,
	global_fit_platform varchar(255) NULL,
	size_profile varchar(255) NULL,
	sales float8 NULL,
	revenue float8 NULL,
	margin float8 NULL,
	size_level_proportion float8 NULL,
	buy_qty float8 NULL
);