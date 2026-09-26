--liquibase formatted sql
--changeset abhishek.singh@impactanalytics.co:ps_reporting_post_promo_date stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
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

--changeset anshika.mungiya@impactanalytics.co:ps_reporting_post_promo_date_June9 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: initial changeset for ps_reporting_post_promo_date_June9

ALTER TABLE PRICE_PROMO.ps_reporting_post_promo_date
ADD COLUMN actual_coupon_amount FLOAT8,
ADD COLUMN lw_coupon_amount FLOAT8,
ADD COLUMN ly_coupon_amount FLOAT8,
ADD COLUMN actual_item_plan_unit FLOAT8 NULL,
ADD COLUMN actual_item_plan_revenue FLOAT8 NULL,
ADD COLUMN actual_item_plan_margin FLOAT8 NULL,
ADD COLUMN ly_item_plan_unit FLOAT8 NULL,
ADD COLUMN ly_item_plan_revenue FLOAT8 NULL,
ADD COLUMN ly_item_plan_margin FLOAT8 NULL,
ADD COLUMN lw_item_plan_unit FLOAT8 NULL,
ADD COLUMN lw_item_plan_revenue FLOAT8 NULL,
ADD COLUMN lw_item_plan_margin FLOAT8 NULL;