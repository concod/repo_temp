--liquibase formatted sql
--changeset yashraj.jha@impactanalytics.co:bp_baseline_sales_overall_2 stripComments:false splitStatements:false context:Release_1_0 labels: liquibase_project_start
--comment: changeset for base_pricing_restaurant.bp_baseline_sales_overall_2

DROP TABLE IF EXISTS base_pricing_restaurant.bp_baseline_sales_overall;

CREATE UNLOGGED TABLE base_pricing_restaurant.bp_baseline_sales_overall (
	product_id int4 NULL,
	channel_id int4 NULL,
	segment_id int4 NULL,
	week_start_date date NULL,
	segment_price numeric NULL,
	segment_cost numeric NULL,
	segment_baseline_sales float8 NULL
);
CREATE INDEX idx_bp_baseline_sales_overall_id1 ON base_pricing_restaurant.bp_baseline_sales_overall USING btree (product_id, channel_id, segment_id, week_start_date);
CREATE INDEX idx_bp_baseline_sales_overall_id2 ON base_pricing_restaurant.bp_baseline_sales_overall USING btree (week_start_date);
CREATE INDEX idx_bp_baseline_sales_overall_id3 ON base_pricing_restaurant.bp_baseline_sales_overall USING btree (product_id);
CREATE INDEX idx_bp_baseline_sales_overall_id4 ON base_pricing_restaurant.bp_baseline_sales_overall USING btree (segment_id);