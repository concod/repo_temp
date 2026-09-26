--liquibase formatted sql
--changeset abhishek.singh@impactanalytics.co:ps_recommended_finalized_stack stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: initial changeset for ps_recommended_finalized_stack

CREATE TABLE price_promo.ps_recommended_finalized_stack (
	event_id int4 NULL,
	promo_ids _int4 NOT NULL,
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
	CONSTRAINT ps_recommended_finalized_stack_pkey PRIMARY KEY (promo_ids, product_id, recommendation_date, s0_id, s1_id)
);
CREATE INDEX promo_id_idx_prfs ON price_promo.ps_recommended_finalized_stack USING gin (promo_ids);



--changeset vaibhav@impactanalytics.co:ps_recommended_finalized_stack_2711 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: initial changeset for ps_recommended_finalized_stack

ALTER TABLE price_promo.ps_recommended_finalized_stack
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
 DROP COLUMN IF EXISTS recommendation_type_id,
ADD COLUMN pos_baseline_sales_units float8 DEFAULT 0 NULL,
ADD COLUMN pos_baseline_revenue float8 DEFAULT 0 NULL,
ADD COLUMN pos_baseline_margin float8 DEFAULT 0 NULL;