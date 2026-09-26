--liquibase formatted sql
--changeset abhishek.singh@impactanalytics.co:ps_reporting_post_promo_date  stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: initial changeset for ps_reporting_post_promo_date


CREATE TABLE price_promo.ps_reporting_post_promo_date (
	promo_id int4 NOT NULL,
	product_id int8 NOT NULL,
	s0_id int8 NOT NULL,
	s0_name varchar NULL,
	s1_id int8 NOT NULL,
	s1_name varchar NULL,
	"date" date NOT NULL,
	fw int2 NOT NULL,
	fy int2 NOT NULL,
	week_start_date date NOT NULL,
	actual_sales_units float8 DEFAULT 0 NULL,
	finalized_sales_units float8 DEFAULT 0 NULL,
	baseline_sales_units float8 DEFAULT 0 NULL,
	actual_revenue float8 DEFAULT 0 NULL,
	finalized_revenue float8 DEFAULT 0 NULL,
	baseline_revenue float8 DEFAULT 0 NULL,
	actual_margin float8 DEFAULT 0 NULL,
	finalized_margin float8 DEFAULT 0 NULL,
	baseline_margin float8 DEFAULT 0 NULL,
	lw_sales_units float8 DEFAULT 0 NULL,
	lw_revenue float8 DEFAULT 0 NULL,
	lw_margin float8 DEFAULT 0 NULL,
	ly_sales_units float8 DEFAULT 0 NULL,
	ly_revenue float8 DEFAULT 0 NULL,
	ly_margin float8 DEFAULT 0 NULL,
	actual_discount float8 DEFAULT 0 NULL,
	actual_inventory float8 DEFAULT 0 NULL,
	actual_contribution_revenue float8 NULL,
	finalized_contribution_revenue float8 NULL,
	actual_contribution_margin float8 NULL,
	finalized_contribution_margin float8 NULL,
	lw_contribution_revenue float8 NULL,
	lw_contribution_margin float8 NULL,
	ly_contribution_revenue float8 NULL,
	ly_contribution_margin float8 NULL,
	fs_sales_units float8 NULL,
	fs_revenue float8 NULL,
	fs_margin float8 NULL,
	fso_sales_units float8 NULL,
	fso_revenue float8 NULL,
	fso_margin float8 NULL,
	event_id int4 DEFAULT 1 NOT NULL,
	CONSTRAINT promo_rep_pkey PRIMARY KEY (promo_id, product_id, s0_id, s1_id, date)
)
PARTITION BY RANGE (date);
CREATE INDEX promo_rep_product_id_idx ON price_promo.ps_reporting_post_promo_date USING btree (product_id);
CREATE INDEX promo_rep_promo_id_idx ON price_promo.ps_reporting_post_promo_date USING btree (promo_id);
CREATE INDEX promo_rep_s1_id_idx ON price_promo.ps_reporting_post_promo_date USING btree (s1_id);
CREATE INDEX promo_rep_s1_id_product_id_idx ON price_promo.ps_reporting_post_promo_date USING btree (s1_id, product_id);




--changeset abhishek.singh@impactanalytics.co:ps_reporting_post_promo_date_2  stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: initial changeset for ps_reporting_post_promo_date_2

ALTER TABLE price_promo.ps_reporting_post_promo_date
 
ADD COLUMN	actual_item_plan_unit float8 NULL,
ADD COLUMN	actual_item_plan_revenue float8 NULL,
ADD COLUMN	actual_item_plan_margin float8 NULL,
ADD COLUMN	ly_item_plan_unit float8 NULL,
ADD COLUMN	ly_item_plan_revenue float8 NULL,
ADD COLUMN	ly_item_plan_margin float8 NULL,
ADD COLUMN	lw_item_plan_unit float8 NULL,
ADD COLUMN	lw_item_plan_revenue float8 NULL,
ADD COLUMN	lw_item_plan_margin float8 NULL,
ADD COLUMN	currency_id int4 NULL,
ADD COLUMN	vat_percentage float4 NULL;

--changeset anshika.mungiya@impactanalytics.co:ps_reporting_post_promo_date_2_2  stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: initial changeset for ps_reporting_post_promo_date_2_2

ALTER TABLE price_promo.ps_reporting_post_promo_date
DROP CONSTRAINT IF EXISTS promo_rep_pkey;

--changeset anshika.mungiya@impactanalytics.co:ps_reporting_post_promo_date_2_3  stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: initial changeset for ps_reporting_post_promo_date_2_3

ALTER TABLE price_promo.ps_reporting_post_promo_date
ADD COLUMN c0_name varchar NOT NULL,
ADD COLUMN channel text NOT NULL,
ADD COLUMN	s3_name varchar NULL,
ADD COLUMN	s3_id int4 NOT NULL,
ADD COLUMN	finalized_spend numeric DEFAULT 0 NULL,
ADD COLUMN	c0_id int4 DEFAULT 0 NOT NULL,
ADD COLUMN	store_hierarchy varchar NULL;

--changeset anshika.mungiya@impactanalytics.co:ps_reporting_post_promo_date_float8_to_float4  stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: Converting float8 columns to float4 data type

ALTER TABLE price_promo.ps_reporting_post_promo_date
ALTER COLUMN actual_sales_units TYPE float4,
ALTER COLUMN finalized_sales_units TYPE float4,
ALTER COLUMN baseline_sales_units TYPE float4,
ALTER COLUMN actual_revenue TYPE float4,
ALTER COLUMN finalized_revenue TYPE float4,
ALTER COLUMN baseline_revenue TYPE float4,
ALTER COLUMN actual_margin TYPE float4,
ALTER COLUMN finalized_margin TYPE float4,
ALTER COLUMN baseline_margin TYPE float4,
ALTER COLUMN lw_sales_units TYPE float4,
ALTER COLUMN lw_revenue TYPE float4,
ALTER COLUMN lw_margin TYPE float4,
ALTER COLUMN ly_sales_units TYPE float4,
ALTER COLUMN ly_revenue TYPE float4,
ALTER COLUMN ly_margin TYPE float4,
ALTER COLUMN actual_discount TYPE float4,
ALTER COLUMN actual_inventory TYPE float4,
ALTER COLUMN actual_contribution_revenue TYPE float4,
ALTER COLUMN finalized_contribution_revenue TYPE float4,
ALTER COLUMN actual_contribution_margin TYPE float4,
ALTER COLUMN finalized_contribution_margin TYPE float4,
ALTER COLUMN lw_contribution_revenue TYPE float4,
ALTER COLUMN lw_contribution_margin TYPE float4,
ALTER COLUMN ly_contribution_revenue TYPE float4,
ALTER COLUMN ly_contribution_margin TYPE float4,
ALTER COLUMN fs_sales_units TYPE float4,
ALTER COLUMN fs_revenue TYPE float4,
ALTER COLUMN fs_margin TYPE float4,
ALTER COLUMN fso_sales_units TYPE float4,
ALTER COLUMN fso_revenue TYPE float4,
ALTER COLUMN fso_margin TYPE float4,
ALTER COLUMN actual_item_plan_unit TYPE float4,
ALTER COLUMN actual_item_plan_revenue TYPE float4,
ALTER COLUMN actual_item_plan_margin TYPE float4,
ALTER COLUMN ly_item_plan_unit TYPE float4,
ALTER COLUMN ly_item_plan_revenue TYPE float4,
ALTER COLUMN ly_item_plan_margin TYPE float4,
ALTER COLUMN lw_item_plan_unit TYPE float4,
ALTER COLUMN lw_item_plan_revenue TYPE float4,
ALTER COLUMN lw_item_plan_margin TYPE float4;

--changeset nikhil.shet@impactanalytics.co:ps_reporting_post_promo_date_drop_s1_columns stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: Drop s1_id indexes and s1_id/s1_name columns

-- Drop the s1_id related indexes
DROP INDEX IF EXISTS promo_rep_s1_id_idx;
DROP INDEX IF EXISTS promo_rep_s1_id_product_id_idx;

-- Drop s1_id and s1_name columns
ALTER TABLE price_promo.ps_reporting_post_promo_date
DROP COLUMN IF EXISTS s1_id,
DROP COLUMN IF EXISTS s1_name;

--changeset nikhil.shet@impactanalytics.co:ps_reporting_post_promo_date_add_customer_columns stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: Add customer_id and customer_name columns
ALTER TABLE price_promo.ps_reporting_post_promo_date
DROP COLUMN IF EXISTS c0_name,
DROP COLUMN IF EXISTS c0_id,
ADD COLUMN IF NOT EXISTS customer_id int8 NULL,
ADD COLUMN IF NOT EXISTS customer_name varchar NULL;