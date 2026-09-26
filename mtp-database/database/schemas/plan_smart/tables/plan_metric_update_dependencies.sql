--liquibase formatted sql
--changeset liquibase:plan_metric_update_dependencies stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for plan_metric_update_dependencies
CREATE TABLE plan_smart.plan_metric_update_dependencies (
	metric varchar NOT NULL,
	description text NULL,
	dependent_metrics jsonb NOT NULL DEFAULT '{}'::jsonb,
	priority int4 NOT NULL DEFAULT 0,
	CONSTRAINT metric_update_dependencies_metric_key UNIQUE (metric)
);