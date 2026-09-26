--liquibase formatted sql
--changeset genuine.basil@impactanalytics.co:allocation_plans stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for allocation_plans
CREATE TABLE source_smart.allocation_plans (
	allocation_id uuid NOT NULL,
	operation_id uuid NOT NULL,
	plan_name varchar(500) NOT NULL,
	season_id varchar(255) NOT NULL,
	season_name varchar(255) NOT NULL,
	category varchar(255) NOT NULL,
	forecast_version varchar(255) NOT NULL,
	status varchar(50) DEFAULT 'draft'::character varying NOT NULL,
	workflow_step int4 DEFAULT 1 NOT NULL,
	is_editable bool DEFAULT true NOT NULL,
	locked_by varchar(255) NULL,
	locked_at timestamptz NULL,
	lock_expires_at timestamptz NULL,
	total_rules_count int4 DEFAULT 0 NOT NULL,
	allocated_products_count int4 DEFAULT 0 NOT NULL,
	allocated_factories_count int4 DEFAULT 0 NOT NULL,
	allocated_units_count int4 DEFAULT 0 NOT NULL,
	created_at timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL,
	created_by varchar(255) NOT NULL,
	updated_at timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL,
	updated_by varchar(255) NOT NULL,
	CONSTRAINT allocation_plans_pkey PRIMARY KEY (allocation_id, operation_id)
);
CREATE INDEX idx_allocation_plans_created_by ON source_smart.allocation_plans USING btree (created_by);
CREATE INDEX idx_allocation_plans_plan_name ON source_smart.allocation_plans USING btree (plan_name);
CREATE INDEX idx_allocation_plans_season_category_forecast ON source_smart.allocation_plans USING btree (season_name, category, forecast_version);
CREATE INDEX idx_allocation_plans_status ON source_smart.allocation_plans USING btree (status);
CREATE INDEX idx_allocation_plans_updated_at ON source_smart.allocation_plans USING btree (updated_at DESC);

--changeset genuine.basil@impactanalytics.co:allocation_plans_submitted_finalized_published stripComments:false splitStatements:true context:Release_1_0
--comment: add submitted_by, submitted_at, finalized_by, finalized_at, published_by, published_at to allocation_plans
ALTER TABLE source_smart.allocation_plans ADD COLUMN IF NOT EXISTS submitted_by varchar(255) NULL;
ALTER TABLE source_smart.allocation_plans ADD COLUMN IF NOT EXISTS submitted_at timestamptz NULL;
ALTER TABLE source_smart.allocation_plans ADD COLUMN IF NOT EXISTS finalized_by varchar(255) NULL;
ALTER TABLE source_smart.allocation_plans ADD COLUMN IF NOT EXISTS finalized_at timestamptz NULL;
ALTER TABLE source_smart.allocation_plans ADD COLUMN IF NOT EXISTS published_by varchar(255) NULL;
ALTER TABLE source_smart.allocation_plans ADD COLUMN IF NOT EXISTS published_at timestamptz NULL;