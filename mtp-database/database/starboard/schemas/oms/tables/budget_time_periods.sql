--liquibase formatted sql
--changeset bhavya.visaria@impactanalytics.co:budget_time_periods stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial version of budget_time_periods

CREATE TABLE IF NOT EXISTS oms.budget_time_periods (
	time_period_id serial4 NOT NULL,
	time_period_key varchar NOT NULL,
	time_period_type varchar NOT NULL,
	fiscal_year int2 NOT NULL,
	fiscal_period int2 NULL,
	period_start_date date NOT NULL,
	period_end_date date NOT NULL,
	parent_time_period_id int4 NULL,
	is_active bool DEFAULT true NOT NULL,
	created_at timestamptz DEFAULT CURRENT_TIMESTAMP NULL,
	CONSTRAINT budget_time_periods_pkey PRIMARY KEY (time_period_id),
	CONSTRAINT uq_time_period UNIQUE (time_period_type, fiscal_year, fiscal_period)
);

CREATE INDEX idx_tp_type ON oms.budget_time_periods(time_period_type);
CREATE INDEX idx_tp_year ON oms.budget_time_periods(fiscal_year);
CREATE INDEX idx_tp_dates ON oms.budget_time_periods(period_start_date, period_end_date);
CREATE INDEX idx_tp_parent ON oms.budget_time_periods(parent_time_period_id);
