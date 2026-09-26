--liquibase formatted sql
--changeset abhishek.singh@impactanalytics.co:ps_recommended_scenarios_stack stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: initial changeset for ps_recommended_scenarios_stack

CREATE TABLE price_promo.ps_recommended_scenarios_stack (
	event_id int4 NULL,
	promo_id int4 NOT NULL,
	scenario_id int4 NOT NULL,
	product_id int8 NOT NULL,
	recommendation_date date NOT NULL,
	s0_id int8 NOT NULL,
	s1_id int8 NOT NULL,
	discount_level_value int8 NULL,
	offer_type_id int4 NULL,
	effective_discount int4 NULL,
	original_cost float8 DEFAULT 0 NULL,
	discounted_price float8 DEFAULT 0 NULL,
	promo_spend float8 DEFAULT 0 NULL,
	sales_units float8 DEFAULT 0 NULL,
	baseline_sales_units float8 DEFAULT 0 NULL,
	incremental_sales_units float8 DEFAULT 0 NULL,
	revenue float8 DEFAULT 0 NULL,
	baseline_revenue float8 DEFAULT 0 NULL,
	incremental_revenue float8 DEFAULT 0 NULL,
	margin float8 DEFAULT 0 NULL,
	baseline_margin float8 DEFAULT 0 NULL,
	incremental_margin float8 DEFAULT 0 NULL,
	affinity_units float8 DEFAULT 0 NULL,
	cannibalization_units float8 DEFAULT 0 NULL,
	pull_forward_units float8 DEFAULT 0 NULL,
	affinity_revenue float8 DEFAULT 0 NULL,
	cannibalization_revenue float8 DEFAULT 0 NULL,
	pull_forward_revenue float8 DEFAULT 0 NULL,
	affinity_margin float8 DEFAULT 0 NULL,
	cannibalization_margin float8 DEFAULT 0 NULL,
	pull_forward_margin float8 DEFAULT 0 NULL,
	calculated_discount float8 NULL,
	created_by int4 NULL,
	updated_by int4 NULL,
	created_at timestamptz NULL,
	updated_at timestamptz DEFAULT now() NULL,
	contribution_revenue float8 NULL,
	contribution_margin float4 NULL,
	offer_type_combined_display_name varchar NULL,
	store_id int4 NOT NULL,
	customer_id int4 NOT NULL,
	CONSTRAINT ps_recommended_scenarios_stack_pkey_2 PRIMARY KEY (promo_id, scenario_id, product_id, recommendation_date, store_id, customer_id),
	CONSTRAINT ps_recommended_scenarios_stack_scenario_id_2 FOREIGN KEY (scenario_id) REFERENCES price_promo.scenario_master(scenario_id) ON DELETE CASCADE
)
PARTITION BY LIST (scenario_id);
CREATE INDEX ps_recommended_scenarios_stack_product_id_idx ON price_promo.ps_recommended_scenarios_stack USING btree (product_id);
CREATE INDEX ps_recommended_scenarios_stack_promo_scenario_id_idx ON price_promo.ps_recommended_scenarios_stack USING btree (promo_id, scenario_id);
CREATE INDEX ps_recommended_scenarios_stack_recommendation_date_idx ON price_promo.ps_recommended_scenarios_stack USING btree (recommendation_date);


--changeset vaibhav@impactanalytics.co:modify_ps_recommended_scenarios_stack_v3 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: Modifying primary key and nullability for ps_recommended_scenarios_stack

-- Step 1: Drop the existing primary key
ALTER TABLE price_promo.ps_recommended_scenarios_stack
DROP CONSTRAINT ps_recommended_scenarios_stack_pkey_2;

-- Step 2: Make store_id and customer_id nullable
ALTER TABLE price_promo.ps_recommended_scenarios_stack
ALTER COLUMN store_id DROP NOT NULL,
ALTER COLUMN customer_id DROP NOT NULL;

-- Step 3: Set new primary key
ALTER TABLE price_promo.ps_recommended_scenarios_stack
ADD CONSTRAINT ps_recommended_scenarios_stack_pkey
PRIMARY KEY (promo_id, scenario_id, recommendation_date, s0_id, s1_id);


--changeset vaibhav@impactanalytics.co:modify_ps_recommended_scenarios_v4 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: Modifying primary key and nullability for ps_recommended_scenarios

-- Step 1: Drop the existing primary key
ALTER TABLE price_promo.ps_recommended_scenarios_stack
DROP CONSTRAINT ps_recommended_scenarios_stack_pkey;

-- Step 3: Set new primary key
ALTER TABLE price_promo.ps_recommended_scenarios_stack
ADD CONSTRAINT ps_recommended_scenarios_stack_pkey
PRIMARY KEY (promo_id, scenario_id, product_id, recommendation_date, s0_id, s1_id);

--changeset vaibhav@impactanalytics.co:update_ps_recommended_scenarios_stack_v5 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: Update ps_recommended_scenarios_stack with additional VAT and currency columns

-- Add new columns to match the updated schema
ALTER TABLE price_promo.ps_recommended_scenarios_stack
  ADD COLUMN IF NOT EXISTS store_hierarchy varchar NOT NULL,
  ADD COLUMN IF NOT EXISTS currency_id int4 DEFAULT 1 NULL,
  ADD COLUMN IF NOT EXISTS effective_discount_with_vat numeric DEFAULT 0 NULL,
  ADD COLUMN IF NOT EXISTS original_price_with_vat numeric DEFAULT 0 NULL,
  ADD COLUMN IF NOT EXISTS original_cost_with_vat numeric DEFAULT 0 NULL,
  ADD COLUMN IF NOT EXISTS discounted_price_with_vat numeric DEFAULT 0 NULL,
  ADD COLUMN IF NOT EXISTS promo_spend_with_vat numeric DEFAULT 0 NULL,
  ADD COLUMN IF NOT EXISTS revenue_with_vat numeric DEFAULT 0 NULL,
  ADD COLUMN IF NOT EXISTS baseline_revenue_with_vat numeric DEFAULT 0 NULL,
  ADD COLUMN IF NOT EXISTS incremental_revenue_with_vat numeric DEFAULT 0 NULL,
  ADD COLUMN IF NOT EXISTS margin_with_vat numeric DEFAULT 0 NULL,
  ADD COLUMN IF NOT EXISTS baseline_margin_with_vat numeric DEFAULT 0 NULL,
  ADD COLUMN IF NOT EXISTS incremental_margin_with_vat numeric DEFAULT 0 NULL,
  ADD COLUMN IF NOT EXISTS aur_with_vat numeric DEFAULT 0 NULL,
  ADD COLUMN IF NOT EXISTS aum_with_vat numeric DEFAULT 0 NULL,
  ADD COLUMN IF NOT EXISTS affinity_revenue_with_vat numeric DEFAULT 0 NULL,
  ADD COLUMN IF NOT EXISTS cannibalization_revenue_with_vat numeric DEFAULT 0 NULL,
  ADD COLUMN IF NOT EXISTS pull_forward_revenue_with_vat numeric DEFAULT 0 NULL,
  ADD COLUMN IF NOT EXISTS affinity_margin_with_vat numeric DEFAULT 0 NULL,
  ADD COLUMN IF NOT EXISTS cannibalization_margin_with_vat numeric DEFAULT 0 NULL,
  ADD COLUMN IF NOT EXISTS pull_forward_margin_with_vat numeric DEFAULT 0 NULL,
  ADD COLUMN IF NOT EXISTS contribution_revenue_with_vat numeric DEFAULT 0 NULL,
  ADD COLUMN IF NOT EXISTS contribution_margin_with_vat numeric DEFAULT 0 NULL,
  ADD COLUMN IF NOT EXISTS vat_percentage float4 DEFAULT 0 NULL,
  ADD COLUMN IF NOT EXISTS baseline_contribution_revenue_with_vat numeric DEFAULT 0 NULL,
  ADD COLUMN IF NOT EXISTS baseline_contribution_margin_with_vat numeric DEFAULT 0 NULL,
  ADD COLUMN IF NOT EXISTS baseline_contribution_revenue float8 DEFAULT 0 NULL,
  ADD COLUMN IF NOT EXISTS baseline_contribution_margin float4 DEFAULT 0 NULL,
  ADD COLUMN IF NOT EXISTS coupon_amount float8 NULL;

-- Drop and recreate primary key
ALTER TABLE price_promo.ps_recommended_scenarios_stack DROP CONSTRAINT ps_recommended_scenarios_stack_pkey;
ALTER TABLE price_promo.ps_recommended_scenarios_stack
  ADD CONSTRAINT ps_recommended_scenarios_stack_pkey PRIMARY KEY (promo_id, scenario_id, product_id, recommendation_date, store_hierarchy, customer_id);


-- Modify column constraints
ALTER TABLE price_promo.ps_recommended_scenarios_stack
  ALTER COLUMN s0_id DROP NOT NULL,
  ALTER COLUMN s1_id DROP NOT NULL;
-- Drop and recreate indexes
DROP INDEX IF EXISTS price_promo.ps_recommended_scenarios_stack_product_id_idx;
CREATE INDEX ps_recommended_scenarios_stack_product_id_idx ON price_promo.ps_recommended_scenarios_stack USING btree (product_id);

DROP INDEX IF EXISTS price_promo.ps_recommended_scenarios_stack_promo_scenario_id_idx;
CREATE INDEX ps_recommended_scenarios_stack_promo_scenario_id_idx ON price_promo.ps_recommended_scenarios_stack USING btree (promo_id, scenario_id);

DROP INDEX IF EXISTS price_promo.ps_recommended_scenarios_stack_recommendation_date_idx;
CREATE INDEX ps_recommended_scenarios_stack_recommendation_date_idx ON price_promo.ps_recommended_scenarios_stack USING btree (recommendation_date);
