--liquibase formatted sql
--changeset abhishek.singh@impactanalytics.co:bp_decision_dashboard_kpi_metrics stripComments:false splitStatements:false context:Release_1_0 labels: liquibase_project_start
--comment: changeset for base_pricing.bp_decision_dashboard_kpi_metrics

CREATE TABLE base_pricing.bp_decision_dashboard_kpi_metrics (
	id serial4 NOT NULL,
	metric_key varchar(50) NOT NULL,
	display_name varchar(100) NOT NULL,
	description text NULL,
	is_active bool DEFAULT true NULL,
	created_at timestamptz DEFAULT CURRENT_TIMESTAMP NULL,
	updated_at timestamptz DEFAULT CURRENT_TIMESTAMP NULL,
	CONSTRAINT bp_decision_dashboard_kpi_metrics_metric_key_key UNIQUE (metric_key),
	CONSTRAINT bp_decision_dashboard_kpi_metrics_pkey PRIMARY KEY (id)
);