--liquibase formatted sql
--changeset liquibase:plan_filter_mappings stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for plan_filter_mappings
CREATE TABLE plan_smart.plan_filter_mappings (
	channel varchar NOT NULL,
	l2_name varchar NOT NULL,
	current_week int4 NOT NULL,
	plan_code int4 NOT NULL,
	CONSTRAINT pk_plan_filter_mappings PRIMARY KEY (channel, l2_name, current_week, plan_code)
);