--liquibase formatted sql
--changeset abhishek.singh@impactanalytics.co:ps_recommended_scenarios_stack_override_agg stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: initial changeset for ps_recommended_scenarios_stack_override_agg

CREATE TABLE price_promo.ps_recommended_scenarios_stack_override_agg (
	event_id int4 NULL,
	promo_id int4 NOT NULL,
	scenario_id int4 NOT NULL,
	recommendation_date date NOT NULL,
	discount_level_value int8 NULL,
	offer_type_combined_display_name varchar NULL,
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
	aur float8 DEFAULT 0 NULL,
	aum float8 DEFAULT 0 NULL,
	affinity_units float8 DEFAULT 0 NULL,
	cannibalization_units float8 DEFAULT 0 NULL,
	pull_forward_units float8 DEFAULT 0 NULL,
	affinity_revenue float8 DEFAULT 0 NULL,
	cannibalization_revenue float8 DEFAULT 0 NULL,
	pull_forward_revenue float8 DEFAULT 0 NULL,
	affinity_margin float8 DEFAULT 0 NULL,
	cannibalization_margin float8 DEFAULT 0 NULL,
	pull_forward_margin float8 DEFAULT 0 NULL,
	recommendation_type_id int4 NULL,
	created_by int4 NULL,
	updated_by int4 NULL,
	created_at timestamptz NULL,
	updated_at timestamptz NULL,
	offer_type_id int4 NULL,
	contribution_revenue float8 NULL,
	contribution_margin float4 NULL,
	CONSTRAINT ps_recommended_scenarios_stack_override_agg_pkey PRIMARY KEY (promo_id, scenario_id, recommendation_date),
	CONSTRAINT ps_recommended_scenarios_stack_override_agg_id FOREIGN KEY (scenario_id) REFERENCES price_promo.scenario_master(scenario_id) ON DELETE CASCADE
);
CREATE INDEX promo_scenario_id_idx_psrssoc_agg ON price_promo.ps_recommended_scenarios_stack_override_agg USING btree (promo_id, scenario_id);
CREATE INDEX recommendation_date_idx_psrssoc_agg ON price_promo.ps_recommended_scenarios_stack_override_agg USING btree (recommendation_date);

--changeset vaibhav@impactanalytics.co:update_ps_recommended_scenarios_stack_override_agg_v2 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: Update ps_recommended_scenarios_stack_override_agg with additional VAT and currency columns

-- Add new columns to match the updated schema
ALTER TABLE price_promo.ps_recommended_scenarios_stack_override_agg
  ADD COLUMN IF NOT EXISTS pos_baseline_sales_units float8 DEFAULT 0 NULL,
  ADD COLUMN IF NOT EXISTS pos_baseline_revenue float8 DEFAULT 0 NULL,
  ADD COLUMN IF NOT EXISTS pos_baseline_margin float8 DEFAULT 0 NULL,
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
  ADD COLUMN IF NOT EXISTS currency_id int4 DEFAULT 1 NOT NULL,
  ADD COLUMN IF NOT EXISTS vat_percentage float4 DEFAULT 0 NULL,
  ADD COLUMN IF NOT EXISTS baseline_contribution_revenue_with_vat numeric DEFAULT 0 NULL,
  ADD COLUMN IF NOT EXISTS baseline_contribution_margin_with_vat numeric DEFAULT 0 NULL,
  ADD COLUMN IF NOT EXISTS baseline_contribution_revenue float8 DEFAULT 0 NULL,
  ADD COLUMN IF NOT EXISTS baseline_contribution_margin float4 DEFAULT 0 NULL,
  ADD COLUMN IF NOT EXISTS coupon_amount float8 NULL;

-- Drop and recreate primary key to include currency_id
ALTER TABLE price_promo.ps_recommended_scenarios_stack_override_agg DROP CONSTRAINT ps_recommended_scenarios_stack_override_agg_pkey;
ALTER TABLE price_promo.ps_recommended_scenarios_stack_override_agg
  ADD CONSTRAINT ps_recommended_scenarios_stack_override_agg_pkey PRIMARY KEY (promo_id, scenario_id, recommendation_date, currency_id);

-- Recreate indexes
DROP INDEX IF EXISTS price_promo.promo_scenario_id_idx_psrssoc_agg;
CREATE INDEX promo_scenario_id_idx_psrssoc_agg ON price_promo.ps_recommended_scenarios_stack_override_agg USING btree (promo_id, scenario_id);

DROP INDEX IF EXISTS price_promo.recommendation_date_idx_psrssoc_agg;
CREATE INDEX recommendation_date_idx_psrssoc_agg ON price_promo.ps_recommended_scenarios_stack_override_agg USING btree (recommendation_date);


--changeset vaibhav@impactanalytics.co:update_ps_recommended_scenarios_stack_override_agg_v3 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: Update ps_recommended_scenarios_stack_override_agg with additional VAT and currency columns

ALTER TABLE price_promo.ps_recommended_scenarios_stack_override_agg
DROP COLUMN IF EXISTS pos_baseline_sales_units,
DROP COLUMN IF EXISTS pos_baseline_revenue,
DROP COLUMN IF EXISTS pos_baseline_margin;
