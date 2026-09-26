--liquibase formatted sql
--changeset harshith.mandli@impactanalytics.co:tb_backsync_reporting_post_event_date stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for tb_backsync_reporting_post_event_date

DROP TABLE IF EXISTS price_promo_opt.tb_backsync_reporting_post_event_date;

CREATE TABLE price_promo_opt.tb_backsync_reporting_post_event_date (
	event_id int4 NULL,
	promo_id _int4 NULL,
	product_id int8 NULL,
	s0_id int8 NULL,
	s0_name varchar NULL,
	s1_id int8 NULL,
	s1_name varchar NULL,
	"date" date NULL,
	fw int2 NULL,
	fy int2 NULL,
	week_start_date date NULL,
	actual_sales_units float8 NULL,
	finalized_sales_units float8 NULL,
	baseline_sales_units float8 NULL,
	actual_revenue float8 NULL,
	finalized_revenue float8 NULL,
	baseline_revenue float8 NULL,
	actual_margin float8 NULL,
	finalized_margin float8 NULL,
	baseline_margin float8 NULL,
	lw_sales_units float8 NULL,
	lw_revenue float8 NULL,
	lw_margin float8 NULL,
	ly_sales_units float8 NULL,
	ly_revenue float8 NULL,
	ly_margin float8 NULL,
	actual_discount float8 NULL,
	finalized_discount float8 NULL,
	actual_inventory float8 NULL,
	actual_contribution_revenue float8 NULL,
	finalized_contribution_revenue float8 NULL,
	actual_contribution_margin float8 NULL,
	finalized_contribution_margin float8 NULL,
	lw_contribution_revenue float8 NULL,
	lw_contribution_margin float8 NULL,
	ly_contribution_revenue float8 NULL,
	ly_contribution_margin float8 NULL,
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
	finalized_spend numeric NULL,
	actual_spend numeric NULL,
	finalized_promo_spend numeric NULL,
	actual_promo_spend numeric NULL,
	finalized_coupon_spend numeric NULL,
	last_backsync_at timestamptz NOT NULL
);

--changeset harshith.mandli@impactanalytics.co:tb_backsync_reporting_post_event_date_v2 stripComments:false splitStatements:false context:Release_1_0 labels:mtp-38202
--comment: changed column event_id from int4 to _int4
ALTER TABLE price_promo_opt.tb_backsync_reporting_post_event_date DROP COLUMN "event_id";
ALTER TABLE price_promo_opt.tb_backsync_reporting_post_event_date ADD COLUMN "event_id" _int4 NULL;

--changeset harshith.mandli@impactanalytics.co:tb_backsync_reporting_post_event_date_v3 stripComments:false splitStatements:false context:Release_1_0 labels:mtp-38202
--comment: changed column event_id from _int4 to int4
ALTER TABLE price_promo_opt.tb_backsync_reporting_post_event_date DROP COLUMN "event_id";
ALTER TABLE price_promo_opt.tb_backsync_reporting_post_event_date ADD COLUMN "event_id" int4 NULL;