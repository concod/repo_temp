--liquibase formatted sql
--changeset liquibase:ps_reporting_post_promo_datev2 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for ps_reporting_post_promo_datev2

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
	actual_coupon_spend float8 NULL,
	lw_coupon_spend float8 NULL,
	ly_coupon_spend float8 NULL,
	actual_item_plan_unit float8 NULL,
	actual_item_plan_revenue float8 NULL,
	actual_item_plan_margin float8 NULL,
	ly_item_plan_unit float8 NULL,
	ly_item_plan_revenue float8 NULL,
	ly_item_plan_margin float8 NULL,
	lw_item_plan_unit float8 NULL,
	lw_item_plan_revenue float8 NULL,
	lw_item_plan_margin float8 NULL,
	finalized_spend numeric DEFAULT 0 NULL,
	actual_spend numeric DEFAULT 0 NULL,
	finalized_promo_spend numeric DEFAULT 0 NULL,
	actual_promo_spend numeric DEFAULT 0 NULL,
	finalized_coupon_spend numeric DEFAULT 0 NULL,
	CONSTRAINT promo_rep_pkey PRIMARY KEY (promo_id, product_id, s0_id, s1_id, date)
)
PARTITION BY RANGE (date);
CREATE INDEX promo_rep_product_id_idx ON price_promo.ps_reporting_post_promo_date USING btree (product_id);
CREATE INDEX promo_rep_promo_id_idx ON price_promo.ps_reporting_post_promo_date USING btree (promo_id);
CREATE INDEX promo_rep_s1_id_idx ON price_promo.ps_reporting_post_promo_date USING btree (s1_id);
CREATE INDEX promo_rep_s1_id_product_id_idx ON price_promo.ps_reporting_post_promo_date USING btree (s1_id, product_id);


--changeset liquibase:ps_reporting_post_promo_datev3 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for store and customer reco level

-- 1. Drop existing Primary Key (Columns s0_id/s1_id are being removed/replaced)
ALTER TABLE price_promo.ps_reporting_post_promo_date 
DROP CONSTRAINT IF EXISTS promo_rep_pkey;

-- 2. Drop old hierarchy columns
ALTER TABLE price_promo.ps_reporting_post_promo_date
    DROP COLUMN IF EXISTS s0_id,
    DROP COLUMN IF EXISTS s0_name,
    DROP COLUMN IF EXISTS s1_id,
    DROP COLUMN IF EXISTS s1_name;

-- 3. Add new hierarchy columns as STRINGS
ALTER TABLE price_promo.ps_reporting_post_promo_date
    ADD COLUMN IF NOT EXISTS store_reco_level VARCHAR(255) DEFAULT '0' NOT NULL,
    ADD COLUMN IF NOT EXISTS customer_reco_level VARCHAR(255);


-- 4. Rename "Item Plan" columns to "Planned" to match Procedure
-- Actuals
ALTER TABLE price_promo.ps_reporting_post_promo_date RENAME COLUMN actual_item_plan_unit TO actual_planned_units;
ALTER TABLE price_promo.ps_reporting_post_promo_date RENAME COLUMN actual_item_plan_revenue TO actual_planned_revenue;
ALTER TABLE price_promo.ps_reporting_post_promo_date RENAME COLUMN actual_item_plan_margin TO actual_planned_margin;
-- Last Year (LY)
ALTER TABLE price_promo.ps_reporting_post_promo_date RENAME COLUMN ly_item_plan_unit TO ly_planned_units;
ALTER TABLE price_promo.ps_reporting_post_promo_date RENAME COLUMN ly_item_plan_revenue TO ly_planned_revenue;
ALTER TABLE price_promo.ps_reporting_post_promo_date RENAME COLUMN ly_item_plan_margin TO ly_planned_margin;
-- Last Week (LW)
ALTER TABLE price_promo.ps_reporting_post_promo_date RENAME COLUMN lw_item_plan_unit TO lw_planned_units;
ALTER TABLE price_promo.ps_reporting_post_promo_date RENAME COLUMN lw_item_plan_revenue TO lw_planned_revenue;
ALTER TABLE price_promo.ps_reporting_post_promo_date RENAME COLUMN lw_item_plan_margin TO lw_planned_margin;

-- 5. Add missing Spend columns referenced in the Procedure
ALTER TABLE price_promo.ps_reporting_post_promo_date
    ADD COLUMN IF NOT EXISTS lw_spend numeric DEFAULT 0,
    ADD COLUMN IF NOT EXISTS ly_spend numeric DEFAULT 0,
    ADD COLUMN IF NOT EXISTS actual_planned_spend numeric DEFAULT 0,
    ADD COLUMN IF NOT EXISTS lw_planned_spend numeric DEFAULT 0,
    ADD COLUMN IF NOT EXISTS ly_planned_spend numeric DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_promo_post_hierarchy 
ON price_promo.ps_reporting_post_promo_date USING btree (promo_id, product_id, store_reco_level, customer_reco_level);