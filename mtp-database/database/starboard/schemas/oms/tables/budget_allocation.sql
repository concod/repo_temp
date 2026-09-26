--liquibase formatted sql
--changeset bhavya.visaria@impactanalytics.co:budget_allocation_update1 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial version of budget_allocation 

CREATE TABLE IF NOT EXISTS oms.budget_allocation (
	budget_id bigserial NOT NULL,
	hierarchy_id int4 NOT NULL,
	time_period_id int4 NOT NULL,
	planned_budget_units float8 NULL,
	planned_budget_cost float8 NULL,
	available_budget_units float8 NULL,
	available_budget_cost float8 NULL,
	budget_type varchar DEFAULT 'PLANNED'::character varying NOT NULL,
	currency_code varchar DEFAULT 'USD'::character varying NULL,
	created_at timestamptz DEFAULT CURRENT_TIMESTAMP NULL,
	updated_at timestamptz DEFAULT CURRENT_TIMESTAMP NULL,
	created_by int4 NULL,
	updated_by int4 NULL,
	CONSTRAINT budget_allocation_pkey PRIMARY KEY (budget_id),
	CONSTRAINT uq_budget_allocation UNIQUE (hierarchy_id, time_period_id, budget_type),
    CONSTRAINT fk_budget_hierarchy FOREIGN KEY (hierarchy_id) REFERENCES oms.budget_product_hierarchy(hierarchy_id),
	CONSTRAINT fk_budget_time_period FOREIGN KEY (time_period_id) REFERENCES oms.budget_time_periods(time_period_id)
);
CREATE INDEX IF NOT EXISTS idx_ba_budget_type ON oms.budget_allocation USING btree (budget_type);
CREATE INDEX IF NOT EXISTS idx_ba_composite ON oms.budget_allocation USING btree (hierarchy_id, time_period_id, budget_type);
CREATE INDEX IF NOT EXISTS idx_ba_hierarchy ON oms.budget_allocation USING btree (hierarchy_id);
CREATE INDEX IF NOT EXISTS idx_ba_time_period ON oms.budget_allocation USING btree (time_period_id);