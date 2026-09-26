--liquibase formatted sql
--changeset vamsi.balaga@impactanalytics.co:ps_recommended_override stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: initial changeset for ps_recommended_override

CREATE TABLE price_promo.ps_recommended_override (
	event_id int4 NULL,
	promo_id int4 NOT NULL,
	scenario_id int4 NOT NULL,
	product_id int8 NOT NULL,
	recommendation_date date NOT NULL,
	s0_id int8 NOT NULL,
	s1_id int8 NOT NULL,
	discount_level_value int8 NULL,
	offer_type_id int4 NULL,
	offer_type_combined_display_name varchar NULL,
	effective_discount int4 NULL,
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
	sales_units_store_day int4 NULL,
	attractiveness_factor float8 NULL,
	store_split_factor float8 NULL,
	day_split_factor float8 NULL,
	fatigue_factor float8 NULL,
	loyalty_factor_final float8 NULL,
	created_by int4 NULL,
	updated_by int4 NULL,
	created_at timestamptz NULL,
	recommendation_type_id int4 DEFAULT 0 NULL,
	updated_at timestamptz DEFAULT now() NULL,
	contribution_revenue float8 NULL,
	contribution_margin float4 NULL,
	CONSTRAINT ps_recommended_override_pkey_2 PRIMARY KEY (promo_id, scenario_id, product_id, recommendation_date, s0_id, s1_id),
	CONSTRAINT ps_recommended_override_scenario_id_2 FOREIGN KEY (scenario_id) REFERENCES price_promo.scenario_master(scenario_id) ON DELETE CASCADE
)
PARTITION BY LIST (scenario_id);
CREATE INDEX product_id_idx_psro ON price_promo.ps_recommended_override USING btree (product_id);
CREATE INDEX promo_scenario_id_idx_psro ON price_promo.ps_recommended_override USING btree (promo_id, scenario_id);
CREATE INDEX recommendation_date_idx_psro ON price_promo.ps_recommended_override USING btree (recommendation_date);

--changeset vamsi.balaga@impactanalytics.co:ps_recommended_override_v261124 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: initial changeset for ps_recommended_override

ALTER TABLE price_promo.ps_recommended_override
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
