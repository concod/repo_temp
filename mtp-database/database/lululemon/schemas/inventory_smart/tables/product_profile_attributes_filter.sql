-- liquibase formatted sql
-- changeset raghav.kirkol@impactanalytics.co:product_profile_attributes_filter stripComments:false splitStatements:false context:MTP labels:MTP
-- comment: initial changeset for product_profile_attributes_filter


CREATE TABLE inventory_smart.product_profile_attributes_filter (
	pp_code int4 NOT NULL,
	article text NULL,
	display_article text NULL,
	l0_name text NULL,
	l1_name text NULL,
	l2_name text NULL,
	l3_name text NULL,
	l4_name text NULL,
	l5_name text NULL,
	l6_name text NULL,
	l7_name text NULL,
	l8_name text NULL,
	l7_code text NULL,
	global_fit_platform text NULL,
	"size" text NULL,
	l0_description text NULL,
	l4_description text NULL,
	l5_description text NULL,
	l6_description text NULL,
	l3_description text NULL,
	channel text NULL,
	CONSTRAINT product_profile_attributes_filter_pkey PRIMARY KEY (pp_code)
);
