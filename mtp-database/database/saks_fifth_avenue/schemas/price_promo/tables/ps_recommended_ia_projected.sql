--liquibase formatted sql
--changeset vaibhav@impactanalytics.co:ps_recommended_ia_projected_v2 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: initial changeset for ps_recommended_ia_projected_v2


CREATE TABLE price_promo.ps_recommended_ia_projected (
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
	recommendation_type_id int4 DEFAULT 1 NULL,
	updated_at timestamptz DEFAULT now() NULL,
	scenario_id int4 NULL
)
PARTITION BY LIST (promo_id);


--changeset abhishek.singh@impactanalytics.co:ps_recommended_ia_projected_v3 stripComments:false splitStatements:false context:Release_1_0 labels: liquibase_project_start
--comment: initial changeset for price_promo.ps_recommended_ia_projected
CREATE INDEX promo_id_idx_priap_v1 ON price_promo.ps_recommended_ia_projected (promo_id);


--changeset vaibhav@impactanalytics.co:ps_recommended_ia_projected_v3 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: initial changeset for ps_recommended_ia_projected_v2

ALTER TABLE  price_promo.ps_recommended_ia_projected
ADD COLUMN contribution_revenue float8 NULL,
ADD COLUMN contribution_margin float4 NULL;

--changeset vaibhav@impactanalytics.co:ps_recommended_ia_projected_v261124 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: initial changeset for ps_recommended_ia_projected_v2

ALTER TABLE price_promo.ps_recommended_ia_projected
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