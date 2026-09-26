--liquibase formatted sql
--changeset vaibhav@impactanalytics.co:ps_recommended_scenarios_v2  stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: initial changeset for ps_recommended_scenarios_v2


CREATE TABLE price_promo.ps_recommended_scenarios (
	event_id int4 NULL,
	promo_id int4 NOT NULL,
	scenario_id int4 NOT NULL,
	product_id int8 NOT NULL,
	recommendation_date date NOT NULL,
	s0_id int8 NOT NULL,
	s1_id int8 NOT NULL,
	discount_level_value int8 NULL,
	offer_type_id int4 NULL,
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
	created_by int4 NULL,
	updated_by int4 NULL,
	created_at timestamptz NULL,
	updated_at timestamptz DEFAULT now() NULL,
	contribution_revenue float8 NULL,
	contribution_margin float4 NULL,
	offer_type_combined_display_name varchar NULL,
	store_id int4 NOT NULL,
	customer_id int4 NOT NULL,
	CONSTRAINT ps_recommended_scenarios_pkey_2 PRIMARY KEY (promo_id, scenario_id, product_id, recommendation_date, store_id, customer_id),
	CONSTRAINT ps_recommended_scenarios_scenario_id_2 FOREIGN KEY (scenario_id) REFERENCES price_promo.scenario_master(scenario_id) ON DELETE CASCADE
)
PARTITION BY LIST (scenario_id);
CREATE INDEX product_id_idx_psrcp ON price_promo.ps_recommended_scenarios USING btree (product_id);
CREATE INDEX promo_scenario_id_idx_psrcp ON price_promo.ps_recommended_scenarios USING btree (promo_id, scenario_id);
CREATE INDEX recommendation_date_idx_psrcp ON price_promo.ps_recommended_scenarios USING btree (recommendation_date);


--changeset vaibhav@impactanalytics.co:modify_ps_recommended_scenarios_v3  stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: Modifying primary key and nullability for ps_recommended_scenarios

-- Step 1: Drop the existing primary key
ALTER TABLE price_promo.ps_recommended_scenarios
DROP CONSTRAINT ps_recommended_scenarios_pkey_2;

-- Step 2: Make store_id and customer_id nullable
ALTER TABLE price_promo.ps_recommended_scenarios
ALTER COLUMN store_id DROP NOT NULL,
ALTER COLUMN customer_id DROP NOT NULL;

-- Step 3: Set new primary key
ALTER TABLE price_promo.ps_recommended_scenarios
ADD CONSTRAINT ps_recommended_scenarios_pkey
PRIMARY KEY (promo_id, scenario_id, recommendation_date, s0_id, s1_id);


--changeset vaibhav@impactanalytics.co:modify_ps_recommended_scenarios_v4  stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: Modifying primary key and nullability for ps_recommended_scenarios

-- Step 1: Drop the existing primary key
ALTER TABLE price_promo.ps_recommended_scenarios
DROP CONSTRAINT ps_recommended_scenarios_pkey;

-- Step 3: Set new primary key
ALTER TABLE price_promo.ps_recommended_scenarios
ADD CONSTRAINT ps_recommended_scenarios_pkey
PRIMARY KEY (promo_id, scenario_id, product_id, recommendation_date, s0_id, s1_id);




--changeset abhishek.singh@impactanalytics.co:ps_recommended_scenarios_2  stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: initial changeset for ps_recommended_scenarios_2

ALTER TABLE price_promo.ps_recommended_scenarios
ADD COLUMN store_hierarchy varchar NULL,
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

	
--changeset anshika.mungiya@impactanalytics.co:ps_recommended_scenarios_may28  stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: initial changeset for ps_recommended_scenarios_may28


ALTER TABLE price_promo.ps_recommended_scenarios
ADD COLUMN s2_id INT,
ADD COLUMN c0_id INT,
ADD COLUMN c1_id INT,
ADD COLUMN c2_id INT;



--changeset anshika.mungiya@impactanalytics.co:ps_recommended_scenarios_may28_s3  stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: initial changeset for ps_recommended_scenarios_may28_s3


ALTER TABLE price_promo.ps_recommended_scenarios
ADD COLUMN s3_id INT;

--changeset anshika.mungiya@impactanalytics.co:ps_recommended_scenarios_may28_cp  stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: initial changeset for ps_recommended_scenarios_may28_cp


ALTER TABLE price_promo.ps_recommended_scenarios
ADD COLUMN current_price float4;

--changeset vaibhav@impactanalytics.co:modify_ps_recommended_scenarios_08102025  stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: Modifying primary key and nullability for ps_recommended_scenarios

ALTER TABLE price_promo.ps_recommended_scenarios
DROP CONSTRAINT IF EXISTS ps_recommended_scenarios_pkey;

--changeset vaibhav.bhosale@impactanalytics.co:reco_scneario_1010  stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: initial changeset for reco_scneario_1010
-- Alter columns to allow NULL values
ALTER TABLE price_promo.ps_recommended_scenarios
    ALTER COLUMN s0_id DROP NOT NULL,
    ALTER COLUMN s1_id DROP NOT NULL;

-- Make store_hierarchy NOT NULL (ensure no NULLs exist first)
ALTER TABLE price_promo.ps_recommended_scenarios ALTER COLUMN store_hierarchy SET NOT NULL;

--changeset anshika.mungiya@impactanalytics.co:ps_recommended_scenarios_float8_to_float4  stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: Converting float8 columns to float4 data type

ALTER TABLE price_promo.ps_recommended_scenarios
ALTER COLUMN original_cost TYPE float4,
ALTER COLUMN discounted_price TYPE float4,
ALTER COLUMN promo_spend TYPE float4,
ALTER COLUMN sales_units TYPE float4,
ALTER COLUMN baseline_sales_units TYPE float4,
ALTER COLUMN incremental_sales_units TYPE float4,
ALTER COLUMN revenue TYPE float4,
ALTER COLUMN baseline_revenue TYPE float4,
ALTER COLUMN incremental_revenue TYPE float4,
ALTER COLUMN margin TYPE float4,
ALTER COLUMN baseline_margin TYPE float4,
ALTER COLUMN incremental_margin TYPE float4,
ALTER COLUMN affinity_units TYPE float4,
ALTER COLUMN cannibalization_units TYPE float4,
ALTER COLUMN pull_forward_units TYPE float4,
ALTER COLUMN affinity_revenue TYPE float4,
ALTER COLUMN cannibalization_revenue TYPE float4,
ALTER COLUMN pull_forward_revenue TYPE float4,
ALTER COLUMN affinity_margin TYPE float4,
ALTER COLUMN cannibalization_margin TYPE float4,
ALTER COLUMN pull_forward_margin TYPE float4,
ALTER COLUMN calculated_discount TYPE float4,
ALTER COLUMN contribution_revenue TYPE float4,
ALTER COLUMN baseline_contribution_revenue TYPE float4;

--changeset vaibhav.bhosale@impactanalytics.co:ps_recommended_scenarios_drop_defaults stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: Drop all default constraints from ps_recommended_scenarios

ALTER TABLE price_promo.ps_recommended_scenarios
ALTER COLUMN original_cost DROP DEFAULT,
ALTER COLUMN discounted_price DROP DEFAULT,
ALTER COLUMN promo_spend DROP DEFAULT,
ALTER COLUMN sales_units DROP DEFAULT,
ALTER COLUMN baseline_sales_units DROP DEFAULT,
ALTER COLUMN incremental_sales_units DROP DEFAULT,
ALTER COLUMN revenue DROP DEFAULT,
ALTER COLUMN baseline_revenue DROP DEFAULT,
ALTER COLUMN incremental_revenue DROP DEFAULT,
ALTER COLUMN margin DROP DEFAULT,
ALTER COLUMN baseline_margin DROP DEFAULT,
ALTER COLUMN incremental_margin DROP DEFAULT,
ALTER COLUMN affinity_units DROP DEFAULT,
ALTER COLUMN cannibalization_units DROP DEFAULT,
ALTER COLUMN pull_forward_units DROP DEFAULT,
ALTER COLUMN affinity_revenue DROP DEFAULT,
ALTER COLUMN cannibalization_revenue DROP DEFAULT,
ALTER COLUMN pull_forward_revenue DROP DEFAULT,
ALTER COLUMN affinity_margin DROP DEFAULT,
ALTER COLUMN cannibalization_margin DROP DEFAULT,
ALTER COLUMN pull_forward_margin DROP DEFAULT,
ALTER COLUMN updated_at DROP DEFAULT,
ALTER COLUMN effective_discount_with_vat DROP DEFAULT,
ALTER COLUMN original_price_with_vat DROP DEFAULT,
ALTER COLUMN original_cost_with_vat DROP DEFAULT,
ALTER COLUMN discounted_price_with_vat DROP DEFAULT,
ALTER COLUMN promo_spend_with_vat DROP DEFAULT,
ALTER COLUMN revenue_with_vat DROP DEFAULT,
ALTER COLUMN baseline_revenue_with_vat DROP DEFAULT,
ALTER COLUMN incremental_revenue_with_vat DROP DEFAULT,
ALTER COLUMN margin_with_vat DROP DEFAULT,
ALTER COLUMN baseline_margin_with_vat DROP DEFAULT,
ALTER COLUMN incremental_margin_with_vat DROP DEFAULT,
ALTER COLUMN aur_with_vat DROP DEFAULT,
ALTER COLUMN aum_with_vat DROP DEFAULT,
ALTER COLUMN affinity_revenue_with_vat DROP DEFAULT,
ALTER COLUMN cannibalization_revenue_with_vat DROP DEFAULT,
ALTER COLUMN pull_forward_revenue_with_vat DROP DEFAULT,
ALTER COLUMN affinity_margin_with_vat DROP DEFAULT,
ALTER COLUMN cannibalization_margin_with_vat DROP DEFAULT,
ALTER COLUMN pull_forward_margin_with_vat DROP DEFAULT,
ALTER COLUMN contribution_revenue_with_vat DROP DEFAULT,
ALTER COLUMN contribution_margin_with_vat DROP DEFAULT,
ALTER COLUMN currency_id DROP DEFAULT,
ALTER COLUMN vat_percentage DROP DEFAULT,
ALTER COLUMN baseline_contribution_revenue_with_vat DROP DEFAULT,
ALTER COLUMN baseline_contribution_margin_with_vat DROP DEFAULT,
ALTER COLUMN baseline_contribution_revenue DROP DEFAULT,
ALTER COLUMN baseline_contribution_margin DROP DEFAULT;

--changeset vaibhav.bhosale@impactanalytics.co:ps_recommended_scenarios_currency_id_default stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: Add default constraint for currency_id

ALTER TABLE price_promo.ps_recommended_scenarios
ALTER COLUMN currency_id SET DEFAULT 1;
