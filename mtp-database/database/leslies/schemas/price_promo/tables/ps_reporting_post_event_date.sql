--liquibase formatted sql
--changeset surya.tenneti@impactanalytics.co:ps_reporting_post_event_date  stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: initial changeset for ps_reporting_post_event_date


CREATE TABLE price_promo.ps_reporting_post_event_date (
	event_id int4 NOT NULL,
	promo_id _int4 NOT NULL,
	product_id int8 NOT NULL,
	s0_id int8 NOT NULL,
	s0_name varchar NULL,
	s1_id int8 NOT NULL,
	s1_name varchar NULL,
	"date" date NOT NULL,
	fw int2 NOT NULL,
	fy int2 NOT NULL,
	week_start_date date NOT NULL,
	actual_sales_units float8 NULL DEFAULT 0,
	finalized_sales_units float8 NULL DEFAULT 0,
	baseline_sales_units float8 NULL DEFAULT 0,
	actual_revenue float8 NULL DEFAULT 0,
	finalized_revenue float8 NULL DEFAULT 0,
	baseline_revenue float8 NULL DEFAULT 0,
	actual_margin float8 NULL DEFAULT 0,
	finalized_margin float8 NULL DEFAULT 0,
	baseline_margin float8 NULL DEFAULT 0,
	lw_sales_units float8 NULL DEFAULT 0,
	lw_revenue float8 NULL DEFAULT 0,
	lw_margin float8 NULL DEFAULT 0,
	ly_sales_units float8 NULL DEFAULT 0,
	ly_revenue float8 NULL DEFAULT 0,
	ly_margin float8 NULL DEFAULT 0,
	actual_discount float8 NULL DEFAULT 0,
	finalized_discount float8 NULL DEFAULT 0,
	actual_inventory float8 NULL DEFAULT 0,
	actual_contribution_revenue float8 NULL,
	finalized_contribution_revenue float8 NULL,
	actual_contribution_margin float8 NULL,
	finalized_contribution_margin float8 NULL,
	lw_contribution_revenue float8 NULL,
	lw_contribution_margin float8 NULL,
	ly_contribution_revenue float8 NULL,
	ly_contribution_margin float8 NULL,
	CONSTRAINT event_rep_pkey PRIMARY KEY (event_id, product_id, s0_id, s1_id, date)
)
PARTITION BY RANGE (date);
CREATE INDEX event_rep_event_id_idx ON price_promo.ps_reporting_post_event_date USING btree (event_id);
CREATE INDEX event_rep_product_id_idx ON price_promo.ps_reporting_post_event_date USING btree (product_id);
CREATE INDEX event_rep_s1_id_idx ON price_promo.ps_reporting_post_event_date USING btree (s1_id);
CREATE INDEX event_rep_s1_id_product_id_idx ON price_promo.ps_reporting_post_event_date USING btree (s1_id, product_id);



--changeset abhishek.singh@impactanalytics.co:ps_reporting_post_event_date_2  stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: initial changeset for ps_reporting_post_event_date_2

ALTER TABLE price_promo.ps_reporting_post_event_date
 
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

--changeset	anshika.mungiya@impactanalytics.co:ps_reporting_post_event_date_2_2  stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: initial changeset for ps_reporting_post_event_date_2_2

ALTER TABLE price_promo.ps_reporting_post_event_date
DROP CONSTRAINT IF EXISTS event_rep_pkey; 

--changeset anshika.mungiya@impactanalytics.co:ps_reporting_post_event_date_2_3  stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: initial changeset for ps_reporting_post_event_date_2_3

ALTER TABLE price_promo.ps_reporting_post_event_date
ADD COLUMN c0_name varchar NOT NULL,
ADD COLUMN channel text NOT NULL,
ADD COLUMN s3_name varchar NULL,
ADD COLUMN s3_id int4 NOT NULL,
ADD COLUMN finalized_spend numeric DEFAULT 0 NULL,
ADD COLUMN c0_id int4 DEFAULT 0 NOT NULL,
ADD COLUMN store_hierarchy varchar NULL;

--changeset anshika.mungiya@impactanalytics.co:ps_reporting_post_event_date_float8_to_float4  stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: Converting float8 columns to float4 data type

ALTER TABLE price_promo.ps_reporting_post_event_date
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
ALTER COLUMN finalized_discount TYPE float4,
ALTER COLUMN actual_inventory TYPE float4,
ALTER COLUMN actual_contribution_revenue TYPE float4,
ALTER COLUMN finalized_contribution_revenue TYPE float4,
ALTER COLUMN actual_contribution_margin TYPE float4,
ALTER COLUMN finalized_contribution_margin TYPE float4,
ALTER COLUMN lw_contribution_revenue TYPE float4,
ALTER COLUMN lw_contribution_margin TYPE float4,
ALTER COLUMN ly_contribution_revenue TYPE float4,
ALTER COLUMN ly_contribution_margin TYPE float4,
ALTER COLUMN actual_item_plan_unit TYPE float4,
ALTER COLUMN actual_item_plan_revenue TYPE float4,
ALTER COLUMN actual_item_plan_margin TYPE float4,
ALTER COLUMN ly_item_plan_unit TYPE float4,
ALTER COLUMN ly_item_plan_revenue TYPE float4,
ALTER COLUMN ly_item_plan_margin TYPE float4,
ALTER COLUMN lw_item_plan_unit TYPE float4,
ALTER COLUMN lw_item_plan_revenue TYPE float4,
ALTER COLUMN lw_item_plan_margin TYPE float4;
