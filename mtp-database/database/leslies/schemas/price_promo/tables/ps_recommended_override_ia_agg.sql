--liquibase formatted sql
--changeset vamsi.balaga@impactanalytics.co:ps_recommended_override_ia_agg  stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: initial changeset for ps_recommended_override_ia_agg

CREATE TABLE price_promo.ps_recommended_override_ia_agg (
	event_id int4 NULL,
	promo_id int4 NOT NULL,
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
	CONSTRAINT ps_recommended_override_ia_agg_pkey PRIMARY KEY (promo_id, recommendation_date)
);
CREATE INDEX promo_id_idx_psriap1_agg ON price_promo.ps_recommended_override_ia_agg USING btree (promo_id);
CREATE INDEX recommendation_date_idx_psriap1_agg ON price_promo.ps_recommended_override_ia_agg USING btree (recommendation_date);



--changeset abhishek.singh@impactanalytics.co:ps_recommended_override_ia_agg_2  stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: initial changeset for ps_recommended_override_ia_agg_2

ALTER TABLE price_promo.ps_recommended_override_ia_agg

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
	baseline_contribution_margin float4 DEFAULT 0 NULL;

