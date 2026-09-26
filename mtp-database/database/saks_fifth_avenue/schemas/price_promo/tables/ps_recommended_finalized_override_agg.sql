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