--liquibase formatted sql
--changeset vamsi.balaga@impactanalytics.co:ps_recommended_override_ia_agg stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: initial changeset for ps_recommended_override_ia_agg

CREATE TABLE price_promo.ps_recommended_override_ia_agg (
	event_id int4 NULL,
	promo_id int4 NOT NULL,
	recommendation_date date NOT NULL,
	discount_level_value int8 NULL,
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

--changeset vamsi.balaga@impactanalytics.co:ps_recommended_override_ia_agg_v261124 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: initial changeset for ps_recommended_override_ia_agg

ALTER TABLE price_promo.ps_recommended_override_ia_agg
 DROP COLUMN IF EXISTS original_price,
 DROP COLUMN IF EXISTS sales_units_lift,
 DROP COLUMN IF EXISTS revenue_lift,
 DROP COLUMN IF EXISTS margin_lift,
 DROP COLUMN IF EXISTS sales_units_store_day,
 DROP COLUMN IF EXISTS attractiveness_factor,
 DROP COLUMN IF EXISTS store_split_factor,
 DROP COLUMN IF EXISTS day_split_factor,
 DROP COLUMN IF EXISTS fatigue_factor,
 DROP COLUMN IF EXISTS loyalty_factor_final;