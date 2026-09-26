--liquibase formatted sql
--changeset abhishek.singh@impactanalytics.co:bp_kpi_metrics_config stripComments:false splitStatements:false context:Release_1_0 labels: liquibase_project_start
--comment: changeset for base_pricing.bp_kpi_metrics_config

CREATE TABLE base_pricing.bp_kpi_metrics_config (
	kpi_metric_id int4 NOT NULL,
	kpi_metric_name varchar(255) NOT NULL,
	kpi_metric_label varchar(255) NOT NULL,
	is_active bool DEFAULT true NOT NULL,
	is_dashboard_graph_kpi bool DEFAULT true NOT NULL,
	is_dashboard_strategy_details_kpi bool DEFAULT true NOT NULL,
	is_maximization_kpi bool DEFAULT true NOT NULL,
	is_optimization_kpi bool DEFAULT true NOT NULL,
	baseline_value numeric(10, 2) NULL,
	ly_value numeric(10, 2) NULL,
	report_display_label varchar NULL,
	CONSTRAINT bp_kpi_metrics_config_pkey PRIMARY KEY (kpi_metric_id)
);

CREATE INDEX idx_kpi_metric_id ON base_pricing.bp_kpi_metrics_config USING btree (kpi_metric_id);
CREATE INDEX idx_kpi_metric_name ON base_pricing.bp_kpi_metrics_config USING btree (kpi_metric_name);