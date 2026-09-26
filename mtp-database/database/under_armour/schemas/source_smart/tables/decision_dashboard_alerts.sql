--liquibase formatted sql
--changeset liquibase:decision_dashboard_alerts stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for decision_dashboard_alerts
CREATE TABLE source_smart.decision_dashboard_alerts (
	alert_id uuid NOT NULL DEFAULT gen_random_uuid(),
	alert_type varchar(50) NOT NULL,
	season_name varchar(255) NOT NULL,
	division varchar(255) NOT NULL,
	forecast_version varchar(255) NULL,
	message text NULL,
	metadata jsonb NULL,
	created_at timestamptz NOT NULL DEFAULT now(),
	reviewed_at timestamptz NULL,
	reviewed_by varchar(255) NULL,
	CONSTRAINT decision_dashboard_alerts_pkey PRIMARY KEY (alert_id)
);
CREATE UNIQUE INDEX idx_dda_new_forecast_dedup ON source_smart.decision_dashboard_alerts (season_name, division, forecast_version) WHERE alert_type = 'Forecast Update';
CREATE INDEX idx_dda_season_division_created ON source_smart.decision_dashboard_alerts USING btree (season_name, division, created_at DESC, alert_id DESC);
CREATE INDEX idx_dda_reviewed_at ON source_smart.decision_dashboard_alerts USING btree (reviewed_at);
