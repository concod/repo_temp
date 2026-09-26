--liquibase formatted sql
--changeset abhishek.singh@impactanalytics.co:ps_recommended_actuals  stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: initial changeset for ps_recommended_actuals


CREATE TABLE price_promo.ps_recommended_actuals (
	event_id int4 NULL,
	promo_id int4 NOT NULL,
	product_id int8 NOT NULL,
	recommendation_date date NOT NULL,
	s0_id int8 NOT NULL,
	s1_id int8 NOT NULL,
	discount_level_value float4 NULL,
	offer_type_id int4 NULL,
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
	store_id int4 NULL,
	customer_id int4 NULL,
	CONSTRAINT actuals_pkey PRIMARY KEY (promo_id, product_id, s0_id, s1_id, recommendation_date)
)
PARTITION BY RANGE (recommendation_date);
CREATE INDEX actuals_product_id_idx ON price_promo.ps_recommended_actuals USING btree (product_id);
CREATE INDEX actuals_promo_id_idx ON price_promo.ps_recommended_actuals USING btree (promo_id);
CREATE INDEX actuals_s1_id_idx ON price_promo.ps_recommended_actuals USING btree (s1_id);
CREATE INDEX actuals_s1_id_product_id_idx ON price_promo.ps_recommended_actuals USING btree (s1_id, product_id);




--changeset abhishek.singh@impactanalytics.co:ps_recommended_actuals_20052025  stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: initial changeset for ps_recommended_actuals_2

ALTER TABLE price_promo.ps_recommended_actuals

ADD COLUMNoffer_type_combined_display_name varchar NULL,

ADD COLUMN	store_hierarchy varchar NULL,

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




--changeset anshika.mungiya@impactanalytics.co:ps_recommended_actuals_may28  stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: initial changeset for ps_recommended_actuals_may28


ALTER TABLE price_promo.ps_recommended_actuals
ADD COLUMN s2_id INT,
ADD COLUMN c0_id INT,
ADD COLUMN c1_id INT,
ADD COLUMN c2_id INT;


--changeset anshika.mungiya@impactanalytics.co:ps_recommended_actuals_may28_s3  stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: initial changeset for ps_recommended_actuals_may28_s3


ALTER TABLE price_promo.ps_recommended_actuals
ADD COLUMN s3_id INT;

--changeset anshika.mungiya@impactanalytics.co:ps_recommended_actuals_cp  stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: initial changeset for ps_recommended_actuals_cp

ALTER TABLE price_promo.ps_recommended_actuals
ADD COLUMN current_price float4;

--changeset anshika.mungiya@impactanalytics.co:ps_recommended_actuals_float8_to_float4  stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: Converting float8 columns to float4 data type

ALTER TABLE price_promo.ps_recommended_actuals
ALTER COLUMN original_price TYPE float4,
ALTER COLUMN original_cost TYPE float4,
ALTER COLUMN discounted_price TYPE float4,
ALTER COLUMN promo_spend TYPE float4,
ALTER COLUMN sales_units TYPE float4,
ALTER COLUMN baseline_sales_units TYPE float4,
ALTER COLUMN incremental_sales_units TYPE float4,
ALTER COLUMN sales_units_lift TYPE float4,
ALTER COLUMN revenue TYPE float4,
ALTER COLUMN baseline_revenue TYPE float4,
ALTER COLUMN incremental_revenue TYPE float4,
ALTER COLUMN revenue_lift TYPE float4,
ALTER COLUMN margin TYPE float4,
ALTER COLUMN baseline_margin TYPE float4,
ALTER COLUMN incremental_margin TYPE float4,
ALTER COLUMN margin_lift TYPE float4,
ALTER COLUMN aur TYPE float4,
ALTER COLUMN aum TYPE float4,
ALTER COLUMN affinity_revenue TYPE float4,
ALTER COLUMN cannibalization_revenue TYPE float4,
ALTER COLUMN pull_forward_revenue TYPE float4,
ALTER COLUMN affinity_margin TYPE float4,
ALTER COLUMN cannibalization_margin TYPE float4,
ALTER COLUMN pull_forward_margin TYPE float4,
ALTER COLUMN recommendation_type_id TYPE float4,
ALTER COLUMN contribution_revenue TYPE float4,
ALTER COLUMN f_baseline_sales_units TYPE float4,
ALTER COLUMN f_baseline_revenue TYPE float4,
ALTER COLUMN f_baseline_margin TYPE float4,
ALTER COLUMN fo_baseline_sales_units TYPE float4,
ALTER COLUMN fo_baseline_revenue TYPE float4,
ALTER COLUMN fo_baseline_margin TYPE float4,
ALTER COLUMN fs_baseline_sales_units TYPE float4,
ALTER COLUMN fs_baseline_revenue TYPE float4,
ALTER COLUMN fs_baseline_margin TYPE float4,
ALTER COLUMN fs_pos_baseline_sales_units TYPE float4,
ALTER COLUMN fs_pos_baseline_revenue TYPE float4,
ALTER COLUMN fs_pos_baseline_margin TYPE float4,
ALTER COLUMN fso_baseline_sales_units TYPE float4,
ALTER COLUMN fso_baseline_revenue TYPE float4,
ALTER COLUMN fso_baseline_margin TYPE float4,
ALTER COLUMN fso_pos_baseline_sales_units TYPE float4,
ALTER COLUMN fso_pos_baseline_revenue TYPE float4,
ALTER COLUMN fso_pos_baseline_margin TYPE float4,
ALTER COLUMN baseline_contribution_revenue TYPE float4,
ALTER COLUMN coupon_discount TYPE float4,
ALTER COLUMN extended_discount TYPE float4,
ALTER COLUMN final_spend TYPE float4;


--changeset nikhil.shet@impactanalytics.co:actuals_column_removal stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: remove s1_id column, indexes and primary key

DROP INDEX IF EXISTS price_promo.actuals_s1_id_product_id_idx;
DROP INDEX IF EXISTS price_promo.actuals_s1_id_idx;

ALTER TABLE price_promo.ps_recommended_actuals
DROP CONSTRAINT IF EXISTS actuals_pkey;

ALTER TABLE price_promo.ps_recommended_actuals
DROP COLUMN IF EXISTS s1_id;

--changeset nikhil.shet@impactanalytics.co:actuals_column_removal_c0_id_v3 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: remove c0_id column, indexes and primary key

ALTER TABLE price_promo.ps_recommended_actuals
DROP COLUMN IF EXISTS c0_id,
ADD COLUMN IF NOT EXISTS customer_id int4 NULL;