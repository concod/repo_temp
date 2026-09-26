--liquibase formatted sql
--changeset mayank.bhardwaj@impactanalytics.co :assort_smart.plan_wedge_opt_constraint_wp stripComments:false splitStatements:false context:MTP-70241 labels:create_table
--comment: initial changeset for plan_wedge_opt_constraint_wp

CREATE TABLE if not exists assort_smart.plan_wedge_opt_constraint_wp (
	min_size int4 NULL,
	min_value int4 NULL,
	max_value int4 NULL,
	"increment" int4 NULL,
	moq int4 NULL,
	cluster_code text NULL,
	cluster_display_name text NULL,
	plan_code int4 NULL,
	special_classification text NULL,
	hierarchy_code text NULL,
	channel int4 NULL,
	sub_channel int4 NULL,
	season_code int4 NULL,
	compare_type int4 NULL
);