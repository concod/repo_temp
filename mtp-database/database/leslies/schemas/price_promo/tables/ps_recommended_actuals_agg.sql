--liquibase formatted sql
--changeset abhishek.singh@impactanalytics.co:ps_recommended_actuals_agg  stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: initial changeset for ps_recommended_actuals_agg


CREATE TABLE price_promo.ps_recommended_actuals_agg (
	event_id int4 NULL,
	promo_id int4 NOT NULL,
	recommendation_date date NOT NULL,
	discount_level_value float4 NULL,
	offer_type_id int4 NULL,
	offer_type_combined_display_name varchar NULL,
	effective_discount float4 NULL,
	original_price float8 DEFAULT 0 NULL,
	original_cost float8 DEFAULT 0 NULL,
	discounted_price float8 DEFAULT 0 NULL,
	promo_spend float8 DEFAULT 0 NULL,
	sales_units float8 DEFAULT 0 NULL,
	baseline_sales_units float8 DEFAULT 0 NULL,
	incremental_sales_units float8 DEFAULT 0 NULL,
	sales_units_lift float8 DEFAULT 0 NULL,
	revenue float8 DEFAULT 0 NULL,
	baseline_revenue float8 DEFAULT 0 NULL,
	incremental_revenue float8 DEFAULT 0 NULL,
	revenue_lift float8 DEFAULT 0 NULL,
	margin float8 DEFAULT 0 NULL,
	baseline_margin float8 DEFAULT 0 NULL,
	incremental_margin float8 DEFAULT 0 NULL,
	margin_lift float8 DEFAULT 0 NULL,
	aur float8 DEFAULT 0 NULL,
	aum float8 DEFAULT 0 NULL,
	affinity_revenue float8 DEFAULT 0 NULL,
	cannibalization_revenue float8 DEFAULT 0 NULL,
	pull_forward_revenue float8 DEFAULT 0 NULL,
	affinity_margin float8 DEFAULT 0 NULL,
	cannibalization_margin float8 DEFAULT 0 NULL,
	pull_forward_margin float8 DEFAULT 0 NULL,
	recommendation_type_id float8 DEFAULT 0 NULL,
	created_by int4 NULL,
	updated_by int4 NULL,
	created_at timestamptz NULL,
	updated_at timestamptz NULL,
	contribution_revenue float8 NULL,
	contribution_margin float4 NULL,
	f_baseline_sales_units float8 NULL,
	f_baseline_revenue float8 NULL,
	f_baseline_margin float8 NULL,
	fo_baseline_sales_units float8 NULL,
	fo_baseline_revenue float8 NULL,
	fo_baseline_margin float8 NULL,
	fs_baseline_sales_units float8 NULL,
	fs_baseline_revenue float8 NULL,
	fs_baseline_margin float8 NULL,
	fs_pos_baseline_sales_units float8 NULL,
	fs_pos_baseline_revenue float8 NULL,
	fs_pos_baseline_margin float8 NULL,
	fso_baseline_sales_units float8 NULL,
	fso_baseline_revenue float8 NULL,
	fso_baseline_margin float8 NULL,
	fso_pos_baseline_sales_units float8 NULL,
	fso_pos_baseline_revenue float8 NULL,
	fso_pos_baseline_margin float8 NULL,
	CONSTRAINT actuals_agg_pkey PRIMARY KEY (promo_id, recommendation_date)
)
PARTITION BY RANGE (recommendation_date);
CREATE INDEX actuals_agg_promo_id_idx ON price_promo.ps_recommended_actuals_agg USING btree (promo_id);


--changeset abhishek.singh@impactanalytics.co:ps_recommended_actuals_agg_20052025  stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: initial changeset for ps_recommended_actuals_agg

ALTER TABLE price_promo.ps_recommended_actuals_agg
ADD COLUMN effective_discount_with_vat numeric DEFAULT 0 NULL,
ADD COLUMN	original_price_with_vat numeric DEFAULT 0 NULL,
 ADD COLUMN
	original_cost_with_vat numeric DEFAULT 0 NULL,
 ADD COLUMN
	discounted_price_with_vat numeric DEFAULT 0 NULL,
 ADD COLUMN
	promo_spend_with_vat numeric DEFAULT 0 NULL,
 ADD COLUMN
	revenue_with_vat numeric DEFAULT 0 NULL,
 ADD COLUMN
	baseline_revenue_with_vat numeric DEFAULT 0 NULL,
 ADD COLUMN
	incremental_revenue_with_vat numeric DEFAULT 0 NULL,
 ADD COLUMN
	margin_with_vat numeric DEFAULT 0 NULL,
 ADD COLUMN
	baseline_margin_with_vat numeric DEFAULT 0 NULL,
 ADD COLUMN
	incremental_margin_with_vat numeric DEFAULT 0 NULL,
 ADD COLUMN
	aur_with_vat numeric DEFAULT 0 NULL,
 ADD COLUMN
	aum_with_vat numeric DEFAULT 0 NULL,
 ADD COLUMN
	affinity_revenue_with_vat numeric DEFAULT 0 NULL,
 ADD COLUMN
	cannibalization_revenue_with_vat numeric DEFAULT 0 NULL,
 ADD COLUMN
	pull_forward_revenue_with_vat numeric DEFAULT 0 NULL,
 ADD COLUMN
	affinity_margin_with_vat numeric DEFAULT 0 NULL,
 ADD COLUMN
	cannibalization_margin_with_vat numeric DEFAULT 0 NULL,
 ADD COLUMN
	pull_forward_margin_with_vat numeric DEFAULT 0 NULL,
 ADD COLUMN
	contribution_revenue_with_vat numeric DEFAULT 0 NULL,
 ADD COLUMN
	contribution_margin_with_vat numeric DEFAULT 0 NULL,
 ADD COLUMN
	currency_id int4 DEFAULT 1 NOT NULL,
 ADD COLUMN
	vat_percentage float4 DEFAULT 0 NULL,
 ADD COLUMN
	baseline_contribution_revenue_with_vat numeric DEFAULT 0 NULL,
 ADD COLUMN
	baseline_contribution_margin_with_vat numeric DEFAULT 0 NULL,
 ADD COLUMN
	baseline_contribution_revenue float8 DEFAULT 0 NULL,
 ADD COLUMN
	baseline_contribution_margin float4 DEFAULT 0 NULL,
 ADD COLUMN
	coupon_discount float8 NULL,
 ADD COLUMN
	extended_discount float8 NULL,
 ADD COLUMN
	final_spend float8 NULL;


