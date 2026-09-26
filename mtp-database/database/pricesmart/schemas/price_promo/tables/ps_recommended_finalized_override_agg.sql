--liquibase formatted sql
--changeset abhishek.singh@impactanalytics.co:ps_recommended_finalized_override_agg stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: initial changeset for ps_recommended_finalized_override_agg

CREATE TABLE price_promo.ps_recommended_finalized_override_agg (
	event_id int4 NULL,
	promo_id int4 NOT NULL,
	recommendation_date date NOT NULL,
	discount_level_value int8 NULL,
	offer_type_combined_display_name varchar NULL,
	effective_discount int4 NULL,
	original_cost float8 NULL DEFAULT 0,
	discounted_price float8 NULL DEFAULT 0,
	promo_spend float8 NULL DEFAULT 0,
	sales_units float8 NULL DEFAULT 0,
	baseline_sales_units float8 NULL DEFAULT 0,
	incremental_sales_units float8 NULL DEFAULT 0,
	revenue float8 NULL DEFAULT 0,
	baseline_revenue float8 NULL DEFAULT 0,
	incremental_revenue float8 NULL DEFAULT 0,
	margin float8 NULL DEFAULT 0,
	baseline_margin float8 NULL DEFAULT 0,
	incremental_margin float8 NULL DEFAULT 0,
	aur float8 NULL DEFAULT 0,
	aum float8 NULL DEFAULT 0,
	affinity_revenue float8 NULL DEFAULT 0,
	cannibalization_revenue float8 NULL DEFAULT 0,
	pull_forward_revenue float8 NULL DEFAULT 0,
	affinity_margin float8 NULL DEFAULT 0,
	cannibalization_margin float8 NULL DEFAULT 0,
	pull_forward_margin float8 NULL DEFAULT 0,
	recommendation_type_id int4 NULL,
	created_by int4 NULL,
	updated_by int4 NULL,
	created_at timestamptz NULL,
	updated_at timestamptz NULL,
	contribution_revenue float8 NULL,
	contribution_margin float4 NULL,
	CONSTRAINT ps_recommended_finalized_override_agg_pkey PRIMARY KEY (promo_id, recommendation_date)
);
CREATE INDEX promo_id_idx_psrfo_agg ON price_promo.ps_recommended_finalized_override_agg USING btree (promo_id);


--changeset vaibhav@impactanalytics.co:update_ps_recommended_finalized_override_agg_v2 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: Update ps_recommended_finalized_override_agg with additional VAT and currency columns

-- Add new columns to match the updated schema
ALTER TABLE price_promo.ps_recommended_finalized_override_agg
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
ALTER TABLE price_promo.ps_recommended_finalized_override_agg DROP CONSTRAINT ps_recommended_finalized_override_agg_pkey;
ALTER TABLE price_promo.ps_recommended_finalized_override_agg
  ADD CONSTRAINT ps_recommended_finalized_override_agg_pkey PRIMARY KEY (promo_id, recommendation_date, currency_id);

-- Recreate index
DROP INDEX IF EXISTS price_promo.promo_id_idx_psrfo_agg;
CREATE INDEX promo_id_idx_psrfo_agg ON price_promo.ps_recommended_finalized_override_agg USING btree (promo_id);