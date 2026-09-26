--liquibase formatted sql
--changeset liquibase:ps_recommended_scenarios_stack_override_aggv2 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for ps_recommended_scenarios_stack_override_aggv2

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
	affinity_revenue float8 DEFAULT 0 NULL,
	cannibalization_revenue float8 DEFAULT 0 NULL,
	pull_forward_revenue float8 DEFAULT 0 NULL,
	affinity_margin float8 DEFAULT 0 NULL,
	cannibalization_margin float8 DEFAULT 0 NULL,
	pull_forward_margin float8 DEFAULT 0 NULL,
	created_by int4 NULL,
	updated_by int4 NULL,
	created_at timestamptz NULL,
	updated_at timestamptz NULL,
	offer_type_id int4 NULL,
	contribution_revenue float8 NULL,
	contribution_margin float4 NULL,
	currency_id int4 DEFAULT 1 NOT NULL,
	vat_percentage float4 DEFAULT 0 NULL,
	price_spend float8 NULL,
	customer_hierarchy varchar NULL,
	gross_revenue float8 NULL,
	gross_margin float8 NULL,
	gross_sales_units float8 NULL,
	coupon_spend float8 NULL,
	CONSTRAINT ps_recommended_scenarios_stack_override_agg_pkey PRIMARY KEY (promo_id, scenario_id, recommendation_date, currency_id),
	CONSTRAINT ps_recommended_scenarios_stack_override_agg_id FOREIGN KEY (scenario_id) REFERENCES price_promo.scenario_master(scenario_id) ON DELETE CASCADE
);
CREATE INDEX promo_scenario_1_id_idx_psrssoc_agg ON price_promo.ps_recommended_scenarios_stack_override_agg USING btree (promo_id, scenario_id);
CREATE INDEX recommendation_date_1_idx_psrssoc_agg ON price_promo.ps_recommended_scenarios_stack_override_agg USING btree (recommendation_date);
--changeset liquibase:ps_recommended_scenarios_stack_override_aggv3 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for ps_recommended_scenarios_stack_override_aggv3
ALTER TABLE price_promo.ps_recommended_scenarios_stack_override_agg
ADD COLUMN margin_wo_vf float8 DEFAULT 0 NULL,
ADD COLUMN scan_back float8 DEFAULT 0 NULL,
ADD COLUMN off_invoice float8 DEFAULT 0 NULL,
ADD COLUMN tot_vendor_fund float8 DEFAULT 0 NULL;

--changeset liquibase:ps_recommended_scenarios_stack_override_aggv4 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for ps_recommended_scenarios_stack_override_aggv4
ALTER TABLE price_promo.ps_recommended_scenarios_stack_override_agg
ADD COLUMN cannibalization_units numeric NULL,
ADD COLUMN pull_forward_units numeric NULL,
ADD COLUMN affinity_units numeric NULL;
