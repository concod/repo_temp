--liquibase formatted sql
--changeset abhishek.singh@impactanalytics.co:ps_recommended_actuals_agg stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
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
	CONSTRAINT actuals_agg_pkey PRIMARY KEY (promo_id, recommendation_date)
)
PARTITION BY RANGE (recommendation_date);

-- CREATE INDEX
CREATE INDEX actuals_agg_promo_id_idx 
	ON price_promo.ps_recommended_actuals_agg USING btree (promo_id);


--changeset abhishek.singh@impactanalytics.co:ps_recommended_actuals_agg_1 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: initial changeset for ps_recommended_actuals_agg

ALTER TABLE price_promo.ps_recommended_actuals_agg
ADD COLUMN contribution_revenue float8 NULL,
ADD COLUMN contribution_margin float4 NULL;

--changeset abhishek.singh@impactanalytics.co:ps_recommended_actuals_agg_v261124 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: initial changeset for ps_recommended_actuals_agg

ALTER TABLE price_promo.ps_recommended_actuals_agg
ADD COLUMN f_baseline_sales_units FLOAT8,
ADD COLUMN f_baseline_revenue FLOAT8,
ADD COLUMN f_baseline_margin FLOAT8,
ADD COLUMN fo_baseline_sales_units FLOAT8,
ADD COLUMN fo_baseline_revenue FLOAT8,
ADD COLUMN fo_baseline_margin FLOAT8,
ADD COLUMN fs_baseline_sales_units FLOAT8,
ADD COLUMN fs_baseline_revenue FLOAT8,
ADD COLUMN fs_baseline_margin FLOAT8,
ADD COLUMN fs_pos_baseline_sales_units FLOAT8,
ADD COLUMN fs_pos_baseline_revenue FLOAT8,
ADD COLUMN fs_pos_baseline_margin FLOAT8,
ADD COLUMN fso_baseline_sales_units FLOAT8,
ADD COLUMN fso_baseline_revenue FLOAT8,
ADD COLUMN fso_baseline_margin FLOAT8,
ADD COLUMN fso_pos_baseline_sales_units FLOAT8,
ADD COLUMN fso_pos_baseline_revenue FLOAT8,
ADD COLUMN fso_pos_baseline_margin FLOAT8;

