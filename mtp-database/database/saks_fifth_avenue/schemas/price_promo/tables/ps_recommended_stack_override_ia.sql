--liquibase formatted sql
--changeset abhishek.singh@impactanalytics.co:ps_recommended_stack_override_ia stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: initial changeset for ps_recommended_stack_override_ia

CREATE TABLE price_promo.ps_recommended_stack_override_ia (
	event_id int4 NULL,
	promo_id int4 NOT NULL,
	product_id int8 NOT NULL,
	recommendation_date date NOT NULL,
	s0_id int8 NOT NULL,
	s1_id int8 NOT NULL,
	discount_level_value int8 NULL,
	offer_type_id int4 NULL,
	offer_type_combined_display_name varchar NULL,
	effective_discount int4 NULL,
	original_price float8 NULL DEFAULT 0,
	original_cost float8 NULL DEFAULT 0,
	discounted_price float8 NULL DEFAULT 0,
	promo_spend float8 NULL DEFAULT 0,
	sales_units float8 NULL DEFAULT 0,
	baseline_sales_units float8 NULL DEFAULT 0,
	incremental_sales_units float8 NULL DEFAULT 0,
	sales_units_lift float8 NULL DEFAULT 0,
	revenue float8 NULL DEFAULT 0,
	baseline_revenue float8 NULL DEFAULT 0,
	incremental_revenue float8 NULL DEFAULT 0,
	revenue_lift float8 NULL DEFAULT 0,
	margin float8 NULL DEFAULT 0,
	baseline_margin float8 NULL DEFAULT 0,
	incremental_margin float8 NULL DEFAULT 0,
	margin_lift float8 NULL DEFAULT 0,
	aur float8 NULL DEFAULT 0,
	aum float8 NULL DEFAULT 0,
	affinity_units float8 NULL DEFAULT 0,
	cannibalization_units float8 NULL DEFAULT 0,
	pull_forward_units float8 NULL DEFAULT 0,
	affinity_revenue float8 NULL DEFAULT 0,
	cannibalization_revenue float8 NULL DEFAULT 0,
	pull_forward_revenue float8 NULL DEFAULT 0,
	affinity_margin float8 NULL DEFAULT 0,
	cannibalization_margin float8 NULL DEFAULT 0,
	pull_forward_margin float8 NULL DEFAULT 0,
	calculated_discount float8 NULL,
	sales_units_store_day int4 NULL,
	attractiveness_factor float8 NULL,
	store_split_factor float8 NULL,
	day_split_factor float8 NULL,
	fatigue_factor float8 NULL,
	loyalty_factor_final float8 NULL,
	created_by int4 NULL,
	updated_by int4 NULL,
	created_at timestamptz NULL,
	recommendation_type_id int4 NULL DEFAULT 1,
	updated_at timestamptz NULL DEFAULT now(),
	scenario_id int4 NULL,
	contribution_revenue float8 NULL,
	contribution_margin float4 NULL
)
PARTITION BY LIST (promo_id);
CREATE INDEX ps_recommended_scenarios_stack_ia_override_product_id_idx ON price_promo.ps_recommended_stack_override_ia USING btree (product_id);
CREATE INDEX ps_recommended_scenarios_stack_ia_override_recommendation_date_ ON price_promo.ps_recommended_stack_override_ia USING btree (recommendation_date);


--changeset vaibhav@impactanalytics.co:ps_recommended_stack_override_ia_2711 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: initial changeset for ps_recommended_stack_override_ia

ALTER TABLE price_promo.ps_recommended_stack_override_ia
 DROP COLUMN IF EXISTS offer_type_combined_display_name,
 DROP COLUMN IF EXISTS original_price,
 DROP COLUMN IF EXISTS sales_units_lift,
 DROP COLUMN IF EXISTS revenue_lift,
 DROP COLUMN IF EXISTS margin_lift,
 DROP COLUMN IF EXISTS aur,
 DROP COLUMN IF EXISTS aum,
 DROP COLUMN IF EXISTS sales_units_store_day,
 DROP COLUMN IF EXISTS attractiveness_factor,
 DROP COLUMN IF EXISTS store_split_factor,
 DROP COLUMN IF EXISTS day_split_factor,
 DROP COLUMN IF EXISTS fatigue_factor,
 DROP COLUMN IF EXISTS loyalty_factor_final,
 DROP COLUMN IF EXISTS recommendation_type_id;
